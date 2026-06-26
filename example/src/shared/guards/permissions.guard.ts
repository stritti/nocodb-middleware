import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../interfaces/user.interface';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

// Permission matrix based on the concept
const PERMISSIONS = {
  admin: {
    authors: { read: true, create: true, update: true, delete: true },
    books: { read: true, create: true, update: true, delete: true },
    users: { read: true, create: true, update: true, delete: true },
    favorites: { read: true, create: true, update: true, delete: true },
  },
  user: {
    authors: { read: true, create: false, update: false, delete: false },
    books: { read: true, create: false, update: false, delete: false },
    users: { read: true, create: false, update: true, delete: false },
    favorites: { read: true, create: true, update: false, delete: true },
  },
  guest: {
    authors: { read: true, create: false, update: false, delete: false },
    books: { read: true, create: false, update: false, delete: false },
    users: { read: false, create: false, update: false, delete: false },
    favorites: { read: false, create: false, update: false, delete: false },
  },
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow public routes (register, login, etc.) to bypass permission checks
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    
    if (!user) {
      throw new ForbiddenException('No user authenticated');
    }

    // Extract table and action from the request
    const path = request.path;
    const method = request.method;
    
    // Determine table and action from the path and method
    const { table, action } = this.extractTableAndAction(path, method);
    
    if (!table) {
      return true; // No specific table, allow access
    }

    // Get permissions for the user's role
    const rolePermissions = PERMISSIONS[user.role as keyof typeof PERMISSIONS];
    
    if (!rolePermissions) {
      throw new ForbiddenException(`Role '${user.role}' not found in permissions`);
    }

    const tablePermissions = rolePermissions[table as keyof typeof rolePermissions];
    
    if (!tablePermissions) {
      throw new ForbiddenException(`Table '${table}' not found in permissions for role '${user.role}'`);
    }

    const hasPermission = tablePermissions[action as keyof typeof tablePermissions];
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `User with role '${user.role}' does not have ${action} permission on table '${table}'`
      );
    }

    // Additional checks for user-specific data
    if (table === 'users' && user.role === 'user' && action === 'read') {
      // Users can only read their own data
      const userId = parseInt(request.params.id);
      if (userId && userId !== user.sub) {
        throw new ForbiddenException('Users can only access their own data');
      }
    }

    if (table === 'favorites' && user.role === 'user') {
      // Users can only access their own favorites
      const userId = parseInt(request.params.userId);
      if (userId && userId !== user.sub) {
        throw new ForbiddenException('Users can only access their own favorites');
      }
    }

    return true;
  }

  private extractTableAndAction(path: string, method: string): { table: string | null; action: string } {
    // Detect nested favorites routes (/api/users/me/favorites/...) as favorites table
    if (/\/api\/users\/me\/favorites/i.test(path)) {
      return { table: 'favorites', action: this.methodToAction(method) };
    }

    // Extract table name from path
    const tableMatch = path.match(/\/api\/([a-zA-Z]+)/);
    const table = tableMatch ? tableMatch[1] : null;

    return { table, action: this.methodToAction(method) };
  }

  private methodToAction(method: string): string {
    switch (method) {
      case 'GET': return 'read';
      case 'POST': return 'create';
      case 'PUT':
      case 'PATCH': return 'update';
      case 'DELETE': return 'delete';
      default: return 'read';
    }
  }
}
