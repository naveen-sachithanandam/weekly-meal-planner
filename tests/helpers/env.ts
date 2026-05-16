export const REQUIRED_ENV_KEYS = [
  "HOME_TIMEZONE",
  "OLLAMA_HOST",
  "OLLAMA_MODEL",
  "DATABASE_URL",
] as const;

export const VALID_ENV: Record<(typeof REQUIRED_ENV_KEYS)[number], string> = {
  HOME_TIMEZONE: "America/Toronto",
  OLLAMA_HOST: "http://localhost:11434",
  OLLAMA_MODEL: "llama3",
  DATABASE_URL: "file:./prisma/test.db",
};

export function applyValidEnv() {
  for (const [key, value] of Object.entries(VALID_ENV)) {
    process.env[key] = value;
  }
}

export function clearConfigEnv() {
  for (const key of REQUIRED_ENV_KEYS) {
    delete process.env[key];
  }
}
