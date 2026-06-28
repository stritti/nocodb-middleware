import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

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
        `IP rate limit exceeded for ${req.ip} on ${req.originalUrl}`,
      );
      res.status(429).json({
        statusCode: 429,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        message: 'Too many requests from this IP, please try again later.',
        error: 'Too Many Requests',
      });
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    // User-based limiting is handled by RateLimitGuard which runs after JWT auth.
    // This middleware only handles IP-based limiting for anonymous/unauthenticated traffic.
    this.ipLimiter(req, res, next);
  }
}
