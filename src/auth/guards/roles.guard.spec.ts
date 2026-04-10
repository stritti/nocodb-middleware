import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function makeContext(userRoles: string[] | undefined): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRoles !== undefined ? { roles: userRoles } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { 
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('should allow when no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);
    const ctx = makeContext(['user']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow when user has a required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext(['admin', 'user']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny when user does not have any required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext(['user']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny when user has no roles', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext([]);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny when user roles is undefined', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext(undefined);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
