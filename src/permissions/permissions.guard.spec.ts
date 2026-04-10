import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { CrudAction } from './enums/crud-action.enum';

function makeContext(
  user: any,
  handler = jest.fn(),
  clazz = class {},
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => clazz,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let permissionsService: jest.Mocked<PermissionsService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    permissionsService = {
      canUserPerformAction: jest.fn(),
    } as any;
    guard = new PermissionsGuard(reflector, permissionsService);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should allow when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const ctx = makeContext({ userId: 1 });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should allow when required permissions list is empty', async () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const ctx = makeContext({ userId: 1 });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user is not authenticated', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { table: 'users', action: CrudAction.READ },
    ]);
    const ctx = makeContext(null);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no userId', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { table: 'users', action: CrudAction.READ },
    ]);
    const ctx = makeContext({ email: 'test@test.com' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow when user has required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { table: 'users', action: CrudAction.READ },
    ]);
    permissionsService.canUserPerformAction.mockResolvedValue(true);
    const ctx = makeContext({ userId: 5 });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(permissionsService.canUserPerformAction).toHaveBeenCalledWith(
      5,
      'users',
      CrudAction.READ,
    );
  });

  it('should throw ForbiddenException when user lacks a required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { table: 'users', action: CrudAction.DELETE },
    ]);
    permissionsService.canUserPerformAction.mockResolvedValue(false);
    const ctx = makeContext({ userId: 5 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should check all required permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      { table: 'users', action: CrudAction.READ },
      { table: 'roles', action: CrudAction.READ },
    ]);
    permissionsService.canUserPerformAction.mockResolvedValue(true);
    const ctx = makeContext({ userId: 5 });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(permissionsService.canUserPerformAction).toHaveBeenCalledTimes(2);
  });
});
