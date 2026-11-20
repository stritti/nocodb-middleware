import express, { Request, Response } from 'express';
import request from 'supertest';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import {
  RateLimitMiddleware,
  RateLimitSettings,
  UserRateLimitGuard,
  readRateLimitSettings,
} from './rate-limit.middleware';

const settings: RateLimitSettings = {
  windowMs: 60_000,
  ipMax: 2,
  userMax: 2,
  adminMax: 4,
};

describe('readRateLimitSettings', () => {
  it('uses defaults for missing or invalid values', () => {
    expect(readRateLimitSettings({ RATE_LIMIT_IP_MAX: 'abc' })).toEqual({
      windowMs: 15 * 60 * 1000,
      ipMax: 100,
      userMax: 200,
      adminMax: 1000,
    });
  });

  it('reads positive integers from the environment', () => {
    expect(
      readRateLimitSettings({
        RATE_LIMIT_WINDOW_MS: '1000',
        RATE_LIMIT_IP_MAX: '5',
        RATE_LIMIT_USER_MAX: '6',
        RATE_LIMIT_ADMIN_MAX: '7',
      }),
    ).toEqual({ windowMs: 1000, ipMax: 5, userMax: 6, adminMax: 7 });
  });
});

describe('RateLimitMiddleware', () => {
  function appWithStatus(status: number) {
    const app = express();
    const middleware = new RateLimitMiddleware(settings);
    app.use(middleware.use.bind(middleware));
    app.get('/', (_req: Request, res: Response) => {
      res.status(status).json({});
    });
    return app;
  }

  it('does not count successful requests', async () => {
    const app = appWithStatus(200);
    for (let i = 0; i < 5; i++) {
      await request(app).get('/').expect(200);
    }
  });

  it('blocks a client network after too many failed requests', async () => {
    const app = appWithStatus(401);
    await request(app).get('/').expect(401);
    await request(app).get('/').expect(401);
    await request(app).get('/').expect(429);
  });
});

describe('UserRateLimitGuard', () => {
  function context(user?: { userId: number; roles?: string[] }) {
    const req = { ip: '203.0.113.1', user, originalUrl: '/api/x' };
    const res = { setHeader: jest.fn(), getHeader: jest.fn(), on: jest.fn() };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;
  }

  async function expectTooManyRequests(promise: Promise<boolean>) {
    const error = await promise.then(
      () => undefined,
      (err: unknown) => err,
    );
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  it('does not limit requests without an authenticated user', async () => {
    const guard = new UserRateLimitGuard(settings);
    for (let i = 0; i < 5; i++) {
      await expect(guard.canActivate(context())).resolves.toBe(true);
    }
  });

  it('limits each user separately', async () => {
    const guard = new UserRateLimitGuard(settings);
    await guard.canActivate(context({ userId: 1 }));
    await guard.canActivate(context({ userId: 1 }));
    await expectTooManyRequests(guard.canActivate(context({ userId: 1 })));

    await expect(guard.canActivate(context({ userId: 2 }))).resolves.toBe(true);
  });

  it('allows admins the higher limit', async () => {
    const guard = new UserRateLimitGuard(settings);
    const admin = { userId: 9, roles: ['admin'] };
    for (let i = 0; i < 4; i++) {
      await expect(guard.canActivate(context(admin))).resolves.toBe(true);
    }
    await expectTooManyRequests(guard.canActivate(context(admin)));
  });
});
