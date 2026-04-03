import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function makeContext(userRoles: string[] | undefined, requiredRoles: string[] | null): ExecutionContext {
  return {
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: userRoles !== undefined ? { roles: userRoles } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('should allow when no roles are required', () => {
    (reflector.get as jest.Mock).mockReturnValue(null);
    const ctx = makeContext(['user'], null);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow when user has a required role', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext(['admin', 'user'], ['admin']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should deny when user does not have any required role', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext(['user'], ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny when user has no roles', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const ctx = makeContext([], ['admin']);
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('should deny when user roles is undefined', () => {
    (reflector.get as jest.Mock).mockReturnValue(['admin']);
    const ctx = {
      getHandler: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: undefined } }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
