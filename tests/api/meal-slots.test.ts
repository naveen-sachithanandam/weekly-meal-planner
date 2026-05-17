import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VALID_ENV, applyValidEnv, clearConfigEnv } from "../helpers/env";
import { getLegacyMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Toronto */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

async function postMealSlot(body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/meal-slots/route");
  const request = new NextRequest("http://localhost/api/meal-slots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

async function postLegacyMealSlot(
  mealType: "BREAKFAST" | "LUNCH" | "DINNER",
  body: Omit<Record<string, unknown>, "mealTypeConfigId" | "mealType">,
) {
  const prisma = getTestPrisma();
  return postMealSlot({
    ...body,
    mealTypeConfigId: await getLegacyMealTypeConfigId(prisma, mealType),
  });
}

function mockOllamaUnreachable() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );
}

function mockOllamaAvailable(options?: {
  generateResponse?: string;
  delayGenerate?: () => Promise<void>;
}) {
  const generateResponse = options?.generateResponse ?? "rice, dal, salt";
  const delayGenerate = options?.delayGenerate;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = url.toString();
      if (href === VALID_ENV.OLLAMA_HOST) {
        return new Response(null, { status: 200 });
      }
      if (href === `${VALID_ENV.OLLAMA_HOST}/api/generate`) {
        if (delayGenerate) {
          await delayGenerate();
        }
        return Response.json({ response: generateResponse });
      }
      throw new Error(`unexpected fetch: ${href}`);
    }),
  );
}

describe("POST /api/meal-slots", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    applyValidEnv();
    vi.resetModules();
    await resetTestDatabase();
    mockOllamaUnreachable();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    clearConfigEnv();
    vi.resetModules();
  });

  it("saves a new meal slot for today when Ollama is unavailable", async () => {
    const response = await postLegacyMealSlot("DINNER", {
      date: "2026-05-14",
      mealName: "Dal rice",
      isToddlerAppropriate: true,
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      date: "2026-05-14",
      mealTypeName: "Dinner",
      mealName: "Dal rice",
      isToddlerAppropriate: true,
      ingredientsStatus: "EMPTY",
      ingredients: [],
    });
    expect(body.id).toBeTruthy();
    expect(body.mealTypeConfigId).toBeTruthy();
  });

  it("rejects meal slots on past days", async () => {
    const response = await postLegacyMealSlot("LUNCH", {
      date: "2026-05-13",
      mealName: "Rasam rice",
      isToddlerAppropriate: true,
    });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Cannot modify meal slots for past days" });
  });

  it("rejects an unknown mealTypeConfigId", async () => {
    const response = await postMealSlot({
      date: "2026-05-15",
      mealTypeConfigId: "nonexistent-config-id",
      mealName: "Idli",
      isToddlerAppropriate: true,
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "mealTypeConfigId must reference an active meal type",
    });
  });

  it("rejects an inactive mealTypeConfigId", async () => {
    const prisma = getTestPrisma();
    const inactive = await prisma.mealTypeConfig.create({
      data: { name: "Brunch", sortOrder: 0, isActive: false },
    });

    const response = await postMealSlot({
      date: "2026-05-15",
      mealTypeConfigId: inactive.id,
      mealName: "Pancakes",
      isToddlerAppropriate: false,
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "mealTypeConfigId must reference an active meal type",
    });
  });

  it("rejects duplicate date and meal type combinations", async () => {
    await postLegacyMealSlot("BREAKFAST", {
      date: "2026-05-15",
      mealName: "Idli",
      isToddlerAppropriate: true,
    });

    const response = await postLegacyMealSlot("BREAKFAST", {
      date: "2026-05-15",
      mealName: "Dosa",
      isToddlerAppropriate: false,
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "A meal slot already exists for this date and meal type",
    });
  });

  it("returns the saved slot before ingredient generation finishes", async () => {
    let releaseGenerate: (() => void) | undefined;
    const generateGate = new Promise<void>((resolve) => {
      releaseGenerate = resolve;
    });

    mockOllamaAvailable({ delayGenerate: () => generateGate });

    const response = await postLegacyMealSlot("DINNER", {
      date: "2026-05-15",
      mealName: "Chapati with sabzi",
      isToddlerAppropriate: true,
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ingredientsStatus).toBe("PENDING");

    const prisma = getTestPrisma();
    const pending = await prisma.mealSlot.findUniqueOrThrow({
      where: { id: body.id },
    });
    expect(pending.ingredientsStatus).toBe("PENDING");

    releaseGenerate!();
    await vi.waitFor(async () => {
      const updated = await prisma.mealSlot.findUniqueOrThrow({
        where: { id: body.id },
        include: { ingredients: true },
      });
      expect(updated.ingredientsStatus).toBe("READY");
      expect(updated.ingredients.map((i) => i.name)).toEqual([
        "rice",
        "dal",
        "salt",
      ]);
    });
  });

  it("populates ingredients when Ollama is available", async () => {
    mockOllamaAvailable({ generateResponse: "idli rice, urad dal" });

    const response = await postLegacyMealSlot("BREAKFAST", {
      date: "2026-05-16",
      mealName: "Idli",
      isToddlerAppropriate: true,
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ingredientsStatus).toBe("PENDING");

    const prisma = getTestPrisma();
    await vi.waitFor(async () => {
      const updated = await prisma.mealSlot.findUniqueOrThrow({
        where: { id: body.id },
        include: { ingredients: true },
      });
      expect(updated.ingredientsStatus).toBe("READY");
      expect(updated.ingredients.map((i) => i.name)).toEqual([
        "idli rice",
        "urad dal",
      ]);
    });
  });
});
