import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// User type from JWT strategy (userId, roles)
interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  roles: string[];
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  // IP-based limiter (fallback for unauthenticated requests)
  private ipLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    // IPv6-safe key generator: normalize IPv6 addresses
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      // Remove IPv4-mapped prefix (::ffff:192.168.1.1 -> 192.168.1.1)
      return ip.replace(/^::ffff:/, '');
    },
    handler: (req: Request, res: Response) => {
      this.logger.warn(
        `IP Rate limit exceeded for ${req.ip} on ${req.originalUrl}`,
      );
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests from this IP, please try again later.',
      });
    },
  });

  // User-based limiter (for authenticated requests)
  private userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req: Request) => {
      const user = req.user as AuthenticatedUser | undefined;
      // Admins (users with 'admin' role) get higher limits
      if (user?.roles?.includes('admin')) {
        return 1000; // 1000 requests per 15 minutes for admins
      }
      return 200; // 200 requests per 15 minutes for regular users
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      const user = req.user as AuthenticatedUser | undefined;
      // Use userId if available, fall back to IP
      return user?.userId?.toString() || req.ip || 'unknown';
    },
    skip: (req: Request) => !req.user,
    handler: (req: Request, res: Response) => {
      const user = req.user as AuthenticatedUser | undefined;
      this.logger.warn(
        `User rate limit exceeded for user ${user?.userId || req.ip} on ${req.originalUrl}`,
      );
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests from this user, please try again later.',
      });
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    // Apply user-based limiter first (if user is authenticated)
    this.userLimiter(req, res, (err) => {
      if (err) {
        // If user limiter fails, check if it's a rate limit error
        if (
          typeof err === 'object' &&
          err !== null &&
          'statusCode' in err &&
          err.statusCode === 429
        ) {
          return; // Rate limit error, don't proceed to IP limiter
        }
        return next(err);
      }
      // For authenticated users, skip IP limiter (already rate limited by user)
      if (req.user) {
        return next();
      }
      // For unauthenticated users, apply IP limiter
      this.ipLimiter(req, res, next);
    });
  }
}
