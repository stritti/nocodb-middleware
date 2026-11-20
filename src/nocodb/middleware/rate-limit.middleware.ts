import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit, {
  ipKeyGenerator,
  RateLimitRequestHandler,
} from 'express-rate-limit';

// ── Rate-limit presets (overridable via environment) ───────────────────────

/** Default window for all rate limiters (15 minutes). */
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/** Default max failed requests per window and client network (pre-auth). */
const DEFAULT_IP_MAX = 100;

/** Default max requests per window for authenticated regular users. */
const DEFAULT_USER_MAX = 200;

/** Default max requests per window for admin users. */
const DEFAULT_ADMIN_MAX = 1000;

export interface RateLimitSettings {
  windowMs: number;
  ipMax: number;
  userMax: number;
  adminMax: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Reads `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_IP_MAX`, `RATE_LIMIT_USER_MAX`
 * and `RATE_LIMIT_ADMIN_MAX`; invalid or missing values use the defaults.
 */
export function readRateLimitSettings(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitSettings {
  return {
    windowMs: positiveInt(env.RATE_LIMIT_WINDOW_MS, DEFAULT_WINDOW_MS),
    ipMax: positiveInt(env.RATE_LIMIT_IP_MAX, DEFAULT_IP_MAX),
    userMax: positiveInt(env.RATE_LIMIT_USER_MAX, DEFAULT_USER_MAX),
    adminMax: positiveInt(env.RATE_LIMIT_ADMIN_MAX, DEFAULT_ADMIN_MAX),
  };
}

// User type from JWT strategy (userId, roles)
interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  roles: string[];
}

/**
 * Rate-limit key for the client address. IPv4-mapped IPv6 addresses count as
 * IPv4; IPv6 addresses are grouped by /56 network, because a single client
 * usually controls a whole prefix and could otherwise rotate addresses to
 * evade the limit.
 *
 * Behind a reverse proxy `req.ip` is only the client address when
 * `TRUST_PROXY` is configured (see `configureApp`).
 */
export function clientIpKey(req: Request): string {
  const ip = req.ip?.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
  return ip ? ipKeyGenerator(ip) : 'unknown';
}

/** Rate-limit key for authenticated users, falling back to the client network. */
export function userRateLimitKey(req: Request): string {
  const user = req.user as AuthenticatedUser | undefined;
  return user?.userId !== undefined ? `user:${user.userId}` : clientIpKey(req);
}

/**
 * Pre-authentication limiter per client network.
 *
 * It runs before the guards, so `req.user` is never set here. Only failed
 * responses (status >= 400, e.g. invalid tokens or probing) count, so many
 * legitimate users behind one NAT or proxy do not share a single bucket for
 * their successful requests. Successful traffic is limited per user by
 * {@link UserRateLimitGuard} after authentication.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly ipLimiter: RateLimitRequestHandler;

  constructor(settings: RateLimitSettings = readRateLimitSettings()) {
    this.ipLimiter = rateLimit({
      windowMs: settings.windowMs,
      limit: settings.ipMax,
      skipSuccessfulRequests: true,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: clientIpKey,
      handler: (req: Request, res: Response) => {
        this.logger.warn(
          `IP rate limit exceeded for ${clientIpKey(req)} on ${req.originalUrl}`,
        );
        res.status(429).json({
          statusCode: 429,
          message: 'Too many requests from this IP, please try again later.',
        });
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    void this.ipLimiter(req, res, next);
  }
}

class UserRateLimitExceeded extends Error {}

/**
 * Per-user limiter. Registered as a global guard after `JwtAuthGuard`, so it
 * sees the authenticated `request.user`. Admins get a higher limit. Public
 * routes (no user) are not limited here; they are covered by
 * {@link RateLimitMiddleware}.
 *
 * Counters are kept in memory per instance. With several instances behind a
 * load balancer each instance limits separately.
 */
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(UserRateLimitGuard.name);
  private readonly userLimiter: RateLimitRequestHandler;

  constructor(settings: RateLimitSettings = readRateLimitSettings()) {
    this.userLimiter = rateLimit({
      windowMs: settings.windowMs,
      limit: (req: Request) => {
        const user = req.user as AuthenticatedUser | undefined;
        return user?.roles?.includes('admin')
          ? settings.adminMax
          : settings.userMax;
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: userRateLimitKey,
      handler: (req: Request, _res: Response, next: NextFunction) => {
        const user = req.user as AuthenticatedUser | undefined;
        this.logger.warn(
          `User rate limit exceeded for user ${user?.userId} on ${req.originalUrl}`,
        );
        next(new UserRateLimitExceeded());
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const user = req.user as AuthenticatedUser | undefined;
    if (user?.userId === undefined) {
      return true;
    }

    await new Promise<void>((resolve, reject) => {
      void this.userLimiter(
        req,
        http.getResponse<Response>(),
        (err?: unknown) => (err ? reject(err as Error) : resolve()),
      );
    }).catch((err: unknown) => {
      if (err instanceof UserRateLimitExceeded) {
        throw new HttpException(
          'Too many requests from this user, please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw err;
    });

    return true;
  }
}
