import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VALID_ENV, applyValidEnv, clearConfigEnv } from "../helpers/env";
import { getLegacyMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Toronto */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

async function patchMealSlot(id: string, body: Record<string, unknown>) {
  const { PATCH } = await import("../../app/api/meal-slots/[id]/route");
  const request = new NextRequest(`http://localhost/api/meal-slots/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

function mockOllamaUnreachable() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("connection refused");
    }),
  );
}

function mockOllamaAvailable(generateResponse = "prawns, masala, oil") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const href = url.toString();
      if (href === VALID_ENV.OLLAMA_HOST) {
        return new Response(null, { status: 200 });
      }
      if (href === `${VALID_ENV.OLLAMA_HOST}/api/generate`) {
        return Response.json({ response: generateResponse });
      }
      throw new Error(`unexpected fetch: ${href}`);
    }),
  );
}

describe("PATCH /api/meal-slots/[id]", () => {
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

  it("updates only the toddler flag without re-running ingredient generation", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: dinnerId,
        mealName: "Chapati with sabzi",
        isToddlerAppropriate: true,
        ingredientsStatus: "READY",
        ingredients: {
          create: [{ name: "wheat flour", approved: true }],
        },
      },
      include: { ingredients: true },
    });

    const response = await patchMealSlot(slot.id, {
      isToddlerAppropriate: false,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: slot.id,
      mealTypeConfigId: dinnerId,
      mealTypeName: "Dinner",
      mealName: "Chapati with sabzi",
      isToddlerAppropriate: false,
      ingredientsStatus: "READY",
    });
    expect(body.ingredients).toHaveLength(1);
    expect(body.ingredients[0].name).toBe("wheat flour");

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects updates to meal slots on past days", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-13",
        mealTypeConfigId: lunchId,
        mealName: "Rasam rice",
        isToddlerAppropriate: true,
        ingredientsStatus: "READY",
      },
    });

    const response = await patchMealSlot(slot.id, { mealName: "Curd rice" });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Cannot modify meal slots for past days" });
  });

  it("discards ingredients and re-runs Ollama when the meal name changes", async () => {
    mockOllamaAvailable("prawns, coconut milk, spices");

    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: dinnerId,
        mealName: "Dal rice",
        isToddlerAppropriate: true,
        ingredientsStatus: "READY",
        ingredients: {
          create: [{ name: "toor dal", approved: true }],
        },
      },
    });

    const response = await patchMealSlot(slot.id, { mealName: "Prawn masala" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mealTypeConfigId: dinnerId,
      mealTypeName: "Dinner",
      mealName: "Prawn masala",
      ingredientsStatus: "PENDING",
      ingredients: [],
    });

    await vi.waitFor(async () => {
      const updated = await prisma.mealSlot.findUniqueOrThrow({
        where: { id: slot.id },
        include: { ingredients: true },
      });
      expect(updated.ingredientsStatus).toBe("READY");
      expect(updated.ingredients.map((i) => i.name)).toEqual([
        "prawns",
        "coconut milk",
        "spices",
      ]);
    });
  });

  it("does not re-run Ollama when the meal name is unchanged", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-16",
        mealTypeConfigId: breakfastId,
        mealName: "Idli",
        isToddlerAppropriate: false,
        ingredientsStatus: "READY",
        ingredients: {
          create: [{ name: "idli rice", approved: false }],
        },
      },
    });

    const response = await patchMealSlot(slot.id, {
      mealName: "Idli",
      isToddlerAppropriate: true,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      mealTypeConfigId: breakfastId,
      mealTypeName: "Breakfast",
      mealName: "Idli",
      isToddlerAppropriate: true,
      ingredientsStatus: "READY",
    });
    expect(body.ingredients).toHaveLength(1);

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
