import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

interface AuthenticatedUser {
  userId?: string;
  roles?: string[];
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class NocoDbContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestWithUser = req as RequestWithUser;
    const user = requestWithUser.user;

    if (user) {
      requestWithUser.headers['x-nocodb-user-id'] = user.userId;
      requestWithUser.headers['x-nocodb-user-roles'] = user.roles
        ? user.roles.join(',')
        : '';
    }

    if (!requestWithUser.headers['x-request-id']) {
      requestWithUser.headers['x-request-id'] = crypto.randomUUID();
    }

    next();
  }
}
