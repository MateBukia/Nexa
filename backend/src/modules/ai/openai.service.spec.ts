import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { OpenAiService } from './openai.service';

describe('OpenAiService', () => {
  const configuredService = (create: jest.Mock) => {
    const service = new OpenAiService(
      new ConfigService({
        OPENAI_API_KEY: 'test-key',
        AI_MODEL: 'test-model',
        aiRequestTimeoutMs: 1000,
      }),
    );
    (
      service as unknown as {
        client: { responses: { create: jest.Mock } };
      }
    ).client = { responses: { create } };
    return service;
  };

  it('rejects AI requests when no API key is configured', async () => {
    const service = new OpenAiService(new ConfigService({}));

    await expect(
      service.extractShoppingFilters('find shoes', [], 'safe-user-id'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns a safe rate-limit response without provider details', async () => {
    const create = jest
      .fn()
      .mockRejectedValue(
        new OpenAI.RateLimitError(
          429,
          { message: 'provider-secret-detail' },
          'provider-secret-detail',
          new Headers(),
        ),
      );
    const service = configuredService(create);

    const request = service.extractShoppingFilters(
      'find shoes',
      [],
      'safe-user-id',
    );
    await expect(request).rejects.toMatchObject({ status: 429 });
    await expect(request).rejects.not.toThrow('provider-secret-detail');
  });

  it('translates provider timeouts into gateway timeouts', async () => {
    const service = configuredService(
      jest.fn().mockRejectedValue(new OpenAI.APIConnectionTimeoutError()),
    );

    await expect(
      service.extractShoppingFilters('find shoes', [], 'safe-user-id'),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it('rejects malformed structured output with a safe gateway error', async () => {
    const service = configuredService(
      jest.fn().mockResolvedValue({ output_text: 'not-json' }),
    );

    await expect(
      service.extractShoppingFilters('find shoes', [], 'safe-user-id'),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('rejects an empty provider response safely', async () => {
    const service = configuredService(
      jest.fn().mockResolvedValue({ output_text: '' }),
    );

    await expect(
      service.extractShoppingFilters('find shoes', [], 'safe-user-id'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('uses a consistent HTTP exception for rate limits', async () => {
    const service = configuredService(
      jest
        .fn()
        .mockRejectedValue(
          new OpenAI.RateLimitError(429, {}, 'rate limited', new Headers()),
        ),
    );

    await expect(
      service.extractShoppingFilters('find shoes', [], 'safe-user-id'),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
