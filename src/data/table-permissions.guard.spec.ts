import {
  ExecutionContext,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TablePermissionsGuard } from './table-permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';
import { CrudAction } from '../permissions/enums/crud-action.enum';

interface FakeRequest {
  method: string;
  params: Record<string, string>;
  user?: { userId?: number; scope?: string[] };
}

function contextFor(request: FakeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TablePermissionsGuard', () => {
  let canUserPerformAction: jest.Mock;
  let guard: TablePermissionsGuard;

  beforeEach(() => {
    canUserPerformAction = jest.fn().mockResolvedValue(false);
    guard = new TablePermissionsGuard({
      canUserPerformAction,
    } as unknown as PermissionsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const request = (
    method: string,
    table: string,
    user: FakeRequest['user'] = { userId: 7 },
  ): FakeRequest => ({ method, params: { table }, user });

  it.each([
    ['GET', CrudAction.READ],
    ['POST', CrudAction.CREATE],
    ['PATCH', CrudAction.UPDATE],
    ['DELETE', CrudAction.DELETE],
  ])(
    'checks the %s request against the %s permission of the table',
    async (method, action) => {
      canUserPerformAction.mockResolvedValue(true);

      await expect(
        guard.canActivate(contextFor(request(method, 'customers'))),
      ).resolves.toBe(true);
      expect(canUserPerformAction).toHaveBeenCalledWith(7, 'customers', action);
    },
  );

  it('denies access when the user has no permission for the table', async () => {
    await expect(
      guard.canActivate(contextFor(request('GET', 'customers'))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('logs a denied request as structured audit fields', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    await expect(
      guard.canActivate(contextFor(request('DELETE', 'customers'))),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(warn).toHaveBeenCalledWith(
      {
        event: 'permission_denied',
        userId: 7,
        action: CrudAction.DELETE,
        table: 'customers',
      },
      'Permission denied',
    );
  });

  it('allows access via a matching OAuth scope without a database lookup', async () => {
    const ctx = contextFor(
      request('POST', 'customers', { userId: 7, scope: ['customers:create'] }),
    );

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(canUserPerformAction).not.toHaveBeenCalled();
  });

  it('does not let a scope for another table or action grant access', async () => {
    const ctx = contextFor(
      request('DELETE', 'customers', {
        userId: 7,
        scope: ['customers:read', 'orders:delete'],
      }),
    );

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it.each(['users', 'roles', 'user_roles', 'table_permissions'])(
    'hides the internal system table %s even from users with full scope',
    async (table) => {
      const ctx = contextFor(
        request('GET', table, { userId: 7, scope: ['*:*'] }),
      );

      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    },
  );

  it.each(['../users', 'customers;drop', 'a b', '', 'x'.repeat(65)])(
    'rejects the invalid table name %j as not found',
    async (table) => {
      await expect(
        guard.canActivate(contextFor(request('GET', table))),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(canUserPerformAction).not.toHaveBeenCalled();
    },
  );

  it('denies a request without an authenticated user', async () => {
    const ctx = contextFor({
      method: 'GET',
      params: { table: 'customers' },
    });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('denies HTTP methods that do not map to a CRUD action', async () => {
    canUserPerformAction.mockResolvedValue(true);

    await expect(
      guard.canActivate(contextFor(request('PUT', 'customers'))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
