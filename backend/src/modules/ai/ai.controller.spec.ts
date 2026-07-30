import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles/roles.guard';
import { AiController } from './ai.controller';

describe('AiController authorization', () => {
  const contextFor = (
    handler: (...args: never[]) => unknown,
    roles: string[],
  ) =>
    ({
      getHandler: () => handler,
      getClass: () => AiController,
      switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
    }) as unknown as ExecutionContext;

  it('prevents customers and support agents from using admin generation', () => {
    const guard = new RolesGuard(new Reflector());
    // Reflector needs the original decorated method rather than a bound copy.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler = AiController.prototype.generateProductCopy;

    expect(guard.canActivate(contextFor(handler, ['customer']))).toBe(false);
    expect(guard.canActivate(contextFor(handler, ['support_agent']))).toBe(
      false,
    );
    expect(guard.canActivate(contextFor(handler, ['admin']))).toBe(true);
  });

  it('keeps review summarization admin-only', () => {
    const guard = new RolesGuard(new Reflector());
    // Reflector needs the original decorated method rather than a bound copy.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const handler = AiController.prototype.summarizeReviews;

    expect(guard.canActivate(contextFor(handler, ['customer']))).toBe(false);
    expect(guard.canActivate(contextFor(handler, ['admin']))).toBe(true);
  });

  it('allows support agents only on support-oriented AI operations', () => {
    const guard = new RolesGuard(new Reflector());

    expect(
      guard.canActivate(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        contextFor(AiController.prototype.draftSupportReply, ['support_agent']),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        // eslint-disable-next-line @typescript-eslint/unbound-method
        contextFor(AiController.prototype.summarizeSupportIssues, [
          'support_agent',
        ]),
      ),
    ).toBe(true);
  });
});
