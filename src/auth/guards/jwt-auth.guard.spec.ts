import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from '../decorators/public.decorator';

class PublicController {
  @Public()
  open() {}

  closed() {}
}

@Public()
class PublicClassController {
  anything() {}
}

function contextFor(
  controller: new () => object,
  handler: string,
): ExecutionContext {
  return {
    getClass: () => controller,
    getHandler: () =>
      (controller.prototype as Record<string, unknown>)[handler],
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let passportCanActivate: jest.SpyInstance;

  beforeEach(() => {
    guard = new JwtAuthGuard(new Reflector());
    passportCanActivate = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows a @Public() handler without checking the JWT', () => {
    const result = guard.canActivate(contextFor(PublicController, 'open'));

    expect(result).toBe(true);
    expect(passportCanActivate).not.toHaveBeenCalled();
  });

  it('allows every handler of a @Public() controller without checking the JWT', () => {
    const result = guard.canActivate(
      contextFor(PublicClassController, 'anything'),
    );

    expect(result).toBe(true);
    expect(passportCanActivate).not.toHaveBeenCalled();
  });

  it('requires a valid JWT for handlers without @Public()', () => {
    const ctx = contextFor(PublicController, 'closed');

    guard.canActivate(ctx);

    expect(passportCanActivate).toHaveBeenCalledWith(ctx);
  });
});
