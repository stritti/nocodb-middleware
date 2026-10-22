import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { CrudAction } from './enums/crud-action.enum';
import { hasScopePermission } from './scope-permission.util';
import { logPermissionDenied } from './permission-audit';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

export interface RequiredPermission {
  table: string;
  action: CrudAction;
}

interface RequestUser {
  userId?: number | string;
  scope?: string[];
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // No permissions required
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user || !user.userId) {
      this.logger.warn('User not authenticated');
      throw new ForbiddenException('User not authenticated');
    }

    // Check all required permissions
    for (const permission of requiredPermissions) {
      const hasPermission =
        hasScopePermission(user.scope, permission.table, permission.action) ||
        (await this.permissionsService.canUserPerformAction(
          Number(user.userId),
          permission.table,
          permission.action,
        ));

      if (!hasPermission) {
        logPermissionDenied(
          this.logger,
          user.userId,
          permission.action,
          permission.table,
        );
        throw new ForbiddenException(
          `Missing permission: ${permission.action} on ${permission.table}`,
        );
      }
    }

    // All permissions satisfied
    return true;
  }
}
