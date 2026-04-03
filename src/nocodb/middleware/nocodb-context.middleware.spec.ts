import { NocoDbContextMiddleware } from './nocodb-context.middleware';

describe('NocoDbContextMiddleware', () => {
  let middleware: NocoDbContextMiddleware;

  beforeEach(() => {
    middleware = new NocoDbContextMiddleware();
  });

  it('should call next()', () => {
    const req: any = { headers: {}, user: undefined };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should set x-nocodb-user-id and x-nocodb-user-roles headers when user is present', () => {
    const req: any = {
      headers: {},
      user: { userId: 42, roles: ['admin', 'user'] },
    };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-nocodb-user-id']).toBe('42');
    expect(req.headers['x-nocodb-user-roles']).toBe('admin,user');
  });

  it('should set empty roles string when user roles is not an array', () => {
    const req: any = {
      headers: {},
      user: { userId: 1, roles: 'admin' },
    };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-nocodb-user-id']).toBe('1');
    expect(req.headers['x-nocodb-user-roles']).toBe('');
  });

  it('should set a request-id if not already present', () => {
    const req: any = { headers: {} };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBeDefined();
    expect(typeof req.headers['x-request-id']).toBe('string');
  });

  it('should not overwrite an existing request-id', () => {
    const existingId = 'existing-request-id-123';
    const req: any = { headers: { 'x-request-id': existingId } };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-request-id']).toBe(existingId);
  });

  it('should not set user headers when user is absent', () => {
    const req: any = { headers: {} };
    const res: any = {};
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.headers['x-nocodb-user-id']).toBeUndefined();
    expect(req.headers['x-nocodb-user-roles']).toBeUndefined();
  });
});
