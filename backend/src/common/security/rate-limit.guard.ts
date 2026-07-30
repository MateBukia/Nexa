import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

type RateLimitEntry = { count: number; resetsAt: number };

@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: string } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const identity = request.user?.id ?? request.ip ?? 'unknown';
    const route = `${request.method}:${context.getClass().name}:${context.getHandler().name}`;
    const key = `${route}:${identity}`;
    const now = Date.now();
    const existing = RateLimitGuard.entries.get(key);
    const entry =
      !existing || existing.resetsAt <= now
        ? { count: 0, resetsAt: now + options.windowMs }
        : existing;

    entry.count += 1;
    RateLimitGuard.entries.set(key, entry);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetsAt - now) / 1000),
    );
    response.setHeader('X-RateLimit-Limit', options.limit);
    response.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, options.limit - entry.count),
    );
    response.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetsAt / 1000));

    if (RateLimitGuard.entries.size > 10000) {
      this.removeExpired(now);
    }
    if (entry.count > options.limit) {
      response.setHeader('Retry-After', retryAfterSeconds);
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private removeExpired(now: number) {
    for (const [key, entry] of RateLimitGuard.entries) {
      if (entry.resetsAt <= now) RateLimitGuard.entries.delete(key);
    }
  }
}
