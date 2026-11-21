import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import rateLimit, {
  ipKeyGenerator,
  RateLimitRequestHandler,
} from 'express-rate-limit';

/** Window for bootstrap attempts (15 minutes). */
const BOOTSTRAP_WINDOW_MS = 15 * 60 * 1000;

/** Max bootstrap attempts per window and client network. */
export const BOOTSTRAP_MAX_ATTEMPTS = 5;

function clientKey(req: Request): string {
  const ip = req.ip?.replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, '');
  return ip ? ipKeyGenerator(ip) : 'unknown';
}

/**
 * Strict limit for `POST /api/bootstrap/admin`, independent of the general
 * rate limit, so the bootstrap token cannot be guessed at API speed.
 */
@Injectable()
export class BootstrapRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BootstrapRateLimitMiddleware.name);
  private readonly limiter: RateLimitRequestHandler = rateLimit({
    windowMs: BOOTSTRAP_WINDOW_MS,
    limit: BOOTSTRAP_MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: clientKey,
    handler: (req: Request, res: Response) => {
      this.logger.warn(
        {
          event: 'bootstrap_admin',
          outcome: 'rate_limited',
          ip: clientKey(req),
        },
        'Bootstrap admin rate limit exceeded',
      );
      res.status(429).json({
        statusCode: 429,
        message: 'Too many bootstrap attempts, please try again later.',
      });
    },
  });

  use(req: Request, res: Response, next: NextFunction): void {
    void this.limiter(req, res, next);
  }
}
