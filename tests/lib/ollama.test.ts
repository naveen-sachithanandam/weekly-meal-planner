import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv, VALID_ENV } from "../helpers/env";
import { getLegacyMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

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

describe("resolveOllamaModelName", () => {
  beforeEach(() => {
    applyValidEnv();
    vi.resetModules();
  });

  afterEach(() => {
    clearConfigEnv();
    vi.resetModules();
  });

  it("matches exact model names", async () => {
    const { resolveOllamaModelName } = await import("../../lib/ollama");
    expect(
      resolveOllamaModelName("llama3.1:latest", ["mistral:latest", "llama3.1:latest"]),
    ).toBe("llama3.1:latest");
  });

  it("resolves llama3 prefix to llama3.1:latest", async () => {
    const { resolveOllamaModelName } = await import("../../lib/ollama");
    expect(resolveOllamaModelName("llama3", ["mistral:latest", "llama3.1:latest"])).toBe(
      "llama3.1:latest",
    );
  });

  it("returns null when no model matches", async () => {
    const { resolveOllamaModelName } = await import("../../lib/ollama");
    expect(resolveOllamaModelName("llama3", ["mistral:latest"])).toBeNull();
  });
});

describe("Ollama reachability and generation", () => {
  beforeEach(async () => {
    applyValidEnv();
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.unstubAllGlobals();
    clearConfigEnv();
    vi.resetModules();
  });

  it("isOllamaReachable is false when /api/tags is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("connection refused");
      }),
    );
    vi.resetModules();

    const { isOllamaReachable } = await import("../../lib/ollama");
    await expect(isOllamaReachable()).resolves.toBe(false);
  });

  it("isOllamaReachable is false when no installed model matches OLLAMA_MODEL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (url.toString() === `${VALID_ENV.OLLAMA_HOST}/api/tags`) {
          return Response.json({ models: [{ name: "mistral:latest" }] });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    vi.resetModules();

    const { isOllamaReachable } = await import("../../lib/ollama");
    await expect(isOllamaReachable()).resolves.toBe(false);
  });

  it("isOllamaReachable is true when a matching model is installed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (url.toString() === `${VALID_ENV.OLLAMA_HOST}/api/tags`) {
          return Response.json({
            models: [{ name: `${VALID_ENV.OLLAMA_MODEL}:latest` }],
          });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    vi.resetModules();

    const { isOllamaReachable } = await import("../../lib/ollama");
    await expect(isOllamaReachable()).resolves.toBe(true);
  });

  it("generateIngredients sets READY with parsed ingredient rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const href = url.toString();
        if (href === `${VALID_ENV.OLLAMA_HOST}/api/tags`) {
          return Response.json({
            models: [{ name: `${VALID_ENV.OLLAMA_MODEL}:latest` }],
          });
        }
        if (href === `${VALID_ENV.OLLAMA_HOST}/api/generate`) {
          return Response.json({ response: "toor dal, rice, ghee" });
        }
        throw new Error(`unexpected fetch: ${href} ${init?.method ?? ""}`);
      }),
    );
    vi.resetModules();

    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: dinnerId,
        mealName: "Dal rice",
        isToddlerAppropriate: true,
        ingredientsStatus: "PENDING",
      },
    });

    const { generateIngredients } = await import("../../lib/ollama");
    await generateIngredients(slot.id, slot.mealName);

    const updated = await prisma.mealSlot.findUniqueOrThrow({
      where: { id: slot.id },
      include: { ingredients: true },
    });
    expect(updated.ingredientsStatus).toBe("READY");
    expect(updated.ingredients.map((i) => i.name)).toEqual([
      "toor dal",
      "rice",
      "ghee",
    ]);
  });

  it("generateIngredients sets FAILED when /api/generate returns a non-OK status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        const href = url.toString();
        if (href === `${VALID_ENV.OLLAMA_HOST}/api/tags`) {
          return Response.json({
            models: [{ name: `${VALID_ENV.OLLAMA_MODEL}:latest` }],
          });
        }
        if (href === `${VALID_ENV.OLLAMA_HOST}/api/generate`) {
          return new Response("model not found", { status: 404 });
        }
        throw new Error(`unexpected fetch: ${href}`);
      }),
    );
    vi.resetModules();

    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: dinnerId,
        mealName: "Dal rice",
        isToddlerAppropriate: true,
        ingredientsStatus: "PENDING",
      },
    });

    const { generateIngredients } = await import("../../lib/ollama");
    await generateIngredients(slot.id, slot.mealName);

    const updated = await prisma.mealSlot.findUniqueOrThrow({
      where: { id: slot.id },
      include: { ingredients: true },
    });
    expect(updated.ingredientsStatus).toBe("FAILED");
    expect(updated.ingredients).toHaveLength(0);
  });

  it("generateIngredients sets FAILED when the model is not installed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        if (url.toString() === `${VALID_ENV.OLLAMA_HOST}/api/tags`) {
          return Response.json({ models: [{ name: "mistral:latest" }] });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    vi.resetModules();

    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: dinnerId,
        mealName: "Dal rice",
        isToddlerAppropriate: true,
        ingredientsStatus: "PENDING",
      },
    });

    const { generateIngredients } = await import("../../lib/ollama");
    await generateIngredients(slot.id, slot.mealName);

    const updated = await prisma.mealSlot.findUniqueOrThrow({
      where: { id: slot.id },
    });
    expect(updated.ingredientsStatus).toBe("FAILED");
  });
});
