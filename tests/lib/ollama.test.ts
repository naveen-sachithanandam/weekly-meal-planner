import { afterEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";

describe("Ollama ingredient prompt", () => {
  afterEach(() => {
    delete process.env.CUISINE_CONTEXT;
    delete process.env.OLLAMA_HOUSEHOLD_PROMPT;
    clearConfigEnv();
    vi.resetModules();
  });

  it("includes optional cuisine and household context from environment", async () => {
    applyValidEnv();
    process.env.CUISINE_CONTEXT = "South Indian or Maharashtrian";
    process.env.OLLAMA_HOUSEHOLD_PROMPT =
      "This is a South Indian household with also Maharashtrian pallete. Use authentic regional ingredients that might be available in Canada.";
    vi.resetModules();

    const { buildIngredientPrompt } = await import("../../lib/ollama");
    const prompt = buildIngredientPrompt("Dal rice");

    expect(prompt).toContain('"Dal rice"');
    expect(prompt).toContain("South Indian or Maharashtrian cuisine");
    expect(prompt).toContain("South Indian household");
    expect(prompt).toContain("comma-separated list");
  });

  it("omits optional context when environment variables are unset", async () => {
    applyValidEnv();
    vi.resetModules();

    const { buildIngredientPrompt } = await import("../../lib/ollama");
    const prompt = buildIngredientPrompt("Dal rice");

    expect(prompt).toBe(
      'List the ingredients needed to make "Dal rice". Return only a simple comma-separated list of ingredients, nothing else.',
    );
  });
});
