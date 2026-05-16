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

function optionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

export const HOME_TIMEZONE = requireEnv("HOME_TIMEZONE");
export const OLLAMA_HOST = requireEnv("OLLAMA_HOST");
export const OLLAMA_MODEL = requireEnv("OLLAMA_MODEL");
export const DATABASE_URL = requireEnv("DATABASE_URL");
export const CUISINE_CONTEXT = optionalEnv("CUISINE_CONTEXT");
export const OLLAMA_HOUSEHOLD_PROMPT = optionalEnv("OLLAMA_HOUSEHOLD_PROMPT");
