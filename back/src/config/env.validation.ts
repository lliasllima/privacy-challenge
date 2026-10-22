const REQUIRED_VARIABLES = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

type EnvConfig = Record<string, unknown>;

/**
 * Fails fast when a required variable is missing or invalid, so the API never
 * starts with an incomplete database configuration.
 */
export function validateEnvironment(config: EnvConfig): EnvConfig {
  const missing = REQUIRED_VARIABLES.filter((key) => {
    const value = config[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  const dbPort = Number(config.DB_PORT);
  if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  const apiPort = Number(config.API_PORT ?? 3000);
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }

  return {
    ...config,
    NODE_ENV: config.NODE_ENV ?? 'development',
    API_PORT: String(apiPort),
    DB_PORT: String(dbPort),
  };
}
