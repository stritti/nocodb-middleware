import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RoleType } from '../decorators/roles.decorator';
import { JwtPayload } from '../interfaces/user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(string | RoleType)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required, access granted
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (!user) {
      return false; // No user authenticated
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some((requiredRole) => {
      if (typeof requiredRole === 'string') {
        return user.role === requiredRole;
      }

      // For role configurations with table and action
      if (requiredRole.role === user.role) {
        // Additional checks for table and action can be added here
        // For now, we just check the role
        return true;
      }

      return false;
    });

    return hasRequiredRole;
  }
}
