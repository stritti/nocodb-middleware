import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RolesRequestUser {
  roles?: string[];
}

interface RolesRequest {
  user?: RolesRequestUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RolesRequest>();
    const userRoles = request.user?.roles;

    if (!Array.isArray(userRoles)) {
      return false;
    }

    return matchRoles(roles, userRoles);
  }
}

function matchRoles(roles: string[], userRoles: string[]): boolean {
  if (!userRoles) return false;
  return userRoles.some((role) => roles.includes(role));
}
