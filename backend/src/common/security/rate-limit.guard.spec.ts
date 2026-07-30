import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  it('returns a consistent 429 after the configured request limit', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        limit: 1,
        windowMs: 60_000,
      }),
    } as unknown as Reflector;
    const setHeader = jest.fn();
    const path = `/rate-limit-test-${crypto.randomUUID()}`;
    class TestController {}
    const testHandler = () => undefined;
    const context = {
      getHandler: () => testHandler,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          path,
          ip: '127.0.0.1',
          route: { path },
        }),
        getResponse: () => ({ setHeader }),
      }),
    } as unknown as ExecutionContext;
    const guard = new RateLimitGuard(reflector);

    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });
});
