import { Logger } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;

  beforeEach(() => {
    middleware = new LoggingMiddleware();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call next()', () => {
    const req: any = {
      method: 'GET',
      originalUrl: '/test',
      get: jest.fn().mockReturnValue('TestAgent/1.0'),
    };
    const res: any = {
      on: jest.fn(),
      statusCode: 200,
    };
    const next = jest.fn();

    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should log on response finish', () => {
    let finishCallback: (() => void) | undefined;
    const req: any = {
      method: 'POST',
      originalUrl: '/api/test',
      get: jest.fn().mockReturnValue(''),
    };
    const res: any = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      }),
      statusCode: 201,
    };
    const next = jest.fn();

    middleware.use(req, res, next);
    finishCallback?.();

    expect(Logger.prototype.log).toHaveBeenCalledWith(
      expect.stringContaining('POST'),
    );
  });

  it('should use empty string when user-agent is missing', () => {
    let finishCallback: (() => void) | undefined;
    const req: any = {
      method: 'DELETE',
      originalUrl: '/api/resource/1',
      get: jest.fn().mockReturnValue(undefined),
    };
    const res: any = {
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      }),
      statusCode: 204,
    };
    const next = jest.fn();

    middleware.use(req, res, next);
    finishCallback?.();

    expect(Logger.prototype.log).toHaveBeenCalled();
  });
});
