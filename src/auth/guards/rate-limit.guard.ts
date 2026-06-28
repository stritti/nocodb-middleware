import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import rateLimit from 'express-rate-limit';

interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  roles: string[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  // User-based limiter — runs as a Guard, after JWT auth
  private userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: (req) => {
      const user = req.user as AuthenticatedUser | undefined;
      // Admins (users with 'admin' role) get higher limits
      if (user?.roles?.includes('admin')) {
        return 1000; // 1000 requests per 15 minutes for admins
      }
      return 200; // 200 requests per 15 minutes for regular users
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const user = req.user as AuthenticatedUser | undefined;
      // Use userId if available, fall back to IP
      return user?.userId?.toString() || req.ip || 'unknown';
    },
    skip: (req) => !req.user,
    handler: (req, res) => {
      const user = req.user as AuthenticatedUser | undefined;
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          message: 'Too many requests, please try again later.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    },
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return new Promise<boolean>((resolve, reject) => {
      try {
        this.userLimiter(request, response, (err?: unknown) => {
          if (err) {
            if (err instanceof HttpException) {
              reject(err);
              return;
            }
            resolve(false);
            return;
          }
          resolve(true);
        });
      } catch (err) {
        if (err instanceof HttpException) {
          reject(err);
        } else {
          resolve(false);
        }
      }
    });
  }
}
