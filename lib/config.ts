function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Copy .env.example to .env.local and set a value for ${key}.`,
    );
  }
  return value;
}

export const HOME_TIMEZONE = requireEnv("HOME_TIMEZONE");
export const OLLAMA_HOST = requireEnv("OLLAMA_HOST");
export const OLLAMA_MODEL = requireEnv("OLLAMA_MODEL");
export const DATABASE_URL = requireEnv("DATABASE_URL");
