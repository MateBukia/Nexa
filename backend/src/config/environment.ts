export const environment = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  aiModel: process.env.AI_MODEL ?? 'gpt-5.6-terra',
  aiRequestTimeoutMs: Number.parseInt(
    process.env.AI_REQUEST_TIMEOUT_MS ?? '30000',
    10,
  ),
});

export function validateEnvironment(config: Record<string, unknown>) {
  const databaseUrl = config.DATABASE_URL;
  const jwtSecret = config.JWT_SECRET;
  const port = Number(config.PORT ?? 4000);
  const frontendUrl = config.FRONTEND_URL ?? 'http://localhost:3000';
  const aiModel = config.AI_MODEL ?? 'gpt-5.6-terra';
  const aiRequestTimeoutValue = config.AI_REQUEST_TIMEOUT_MS ?? '30000';
  const aiRequestTimeoutMs =
    typeof aiRequestTimeoutValue === 'string' ||
    typeof aiRequestTimeoutValue === 'number'
      ? Number(aiRequestTimeoutValue)
      : Number.NaN;

  if (
    typeof databaseUrl !== 'string' ||
    !databaseUrl.startsWith('postgresql://')
  ) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  if (typeof frontendUrl !== 'string' || !frontendUrl.trim()) {
    throw new Error('FRONTEND_URL must contain at least one allowed origin.');
  }
  for (const origin of frontendUrl.split(',').map((value) => value.trim())) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`FRONTEND_URL contains an invalid origin: ${origin}`);
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.origin !== origin ||
      origin.includes('*')
    ) {
      throw new Error(
        'FRONTEND_URL origins must use HTTP(S), contain no path, and cannot use wildcards.',
      );
    }
  }

  if (typeof aiModel !== 'string' || !aiModel.trim()) {
    throw new Error('AI_MODEL must be a non-empty model identifier.');
  }

  if (
    !Number.isInteger(aiRequestTimeoutMs) ||
    aiRequestTimeoutMs < 1000 ||
    aiRequestTimeoutMs > 120000
  ) {
    throw new Error(
      'AI_REQUEST_TIMEOUT_MS must be an integer between 1000 and 120000.',
    );
  }

  return config;
}
