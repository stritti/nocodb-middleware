import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class NocoDbContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Assuming JwtAuthGuard has already run and attached user to req.user
    // If not, we might need to handle that or this middleware should run after Auth
    const user = (req as any).user;

    if (user) {
      // Set NocoDB specific headers or context based on user.
      // Header values must always be strings, so coerce both fields explicitly.
      req.headers['x-nocodb-user-id'] = String(user.userId ?? '');
      req.headers['x-nocodb-user-roles'] = Array.isArray(user.roles)
        ? user.roles.join(',')
        : '';
    }

    // Generate a Request ID for tracing if not present
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = crypto.randomUUID();
    }

    next();
  }
}
