import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REQUIRED_ENV_KEYS,
  VALID_ENV,
  applyValidEnv,
  clearConfigEnv,
} from "../helpers/env";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("environment config", () => {
  afterEach(() => {
    clearConfigEnv();
    vi.resetModules();
  });

  it("documents required keys in .env.example", () => {
    const example = readFileSync(path.join(root, ".env.example"), "utf8");

    for (const key of REQUIRED_ENV_KEYS) {
      expect(example).toMatch(new RegExp(`^${key}=`, "m"));
    }
  });

  it.each(REQUIRED_ENV_KEYS)(
    "refuses to boot when %s is missing",
    async (missingKey) => {
      applyValidEnv();
      delete process.env[missingKey];

      await expect(import("../../lib/config")).rejects.toThrow(
        `Missing required environment variable: ${missingKey}`,
      );
    },
  );

  it("exports typed config constants when all required variables are set", async () => {
    applyValidEnv();

    const config = await import("../../lib/config");

    expect(config.HOME_TIMEZONE).toBe(VALID_ENV.HOME_TIMEZONE);
    expect(config.OLLAMA_HOST).toBe(VALID_ENV.OLLAMA_HOST);
    expect(config.OLLAMA_MODEL).toBe(VALID_ENV.OLLAMA_MODEL);
    expect(config.DATABASE_URL).toBe(VALID_ENV.DATABASE_URL);
  });

  it("trims whitespace from environment values", async () => {
    applyValidEnv();
    process.env.HOME_TIMEZONE = "  America/Chicago  ";

    const config = await import("../../lib/config");

    expect(config.HOME_TIMEZONE).toBe("America/Chicago");
  });
});
