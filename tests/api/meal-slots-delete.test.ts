import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";
import {
  getLegacyMealTypeConfigId,
  seedDefaultMealTypeConfigs,
} from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Toronto */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

async function deleteMealSlot(id: string) {
  const { DELETE } = await import("../../app/api/meal-slots/[id]/route");
  const request = new NextRequest(`http://localhost/api/meal-slots/${id}`, {
    method: "DELETE",
  });
  return DELETE(request, { params: Promise.resolve({ id }) });
}

describe("DELETE /api/meal-slots/[id]", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    applyValidEnv();
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.useRealTimers();
    clearConfigEnv();
    vi.resetModules();
  });

  it("removes the meal slot and its ingredients", async () => {
    const prisma = getTestPrisma();
    await seedDefaultMealTypeConfigs(prisma);
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

    const response = await deleteMealSlot(slot.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");

    const deletedSlot = await prisma.mealSlot.findUnique({
      where: { id: slot.id },
    });
    const remainingIngredients = await prisma.ingredient.findMany({
      where: { mealSlotId: slot.id },
    });

    expect(deletedSlot).toBeNull();
    expect(remainingIngredients).toHaveLength(0);
  });

  it("rejects deletion of meal slots on past days", async () => {
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

    const response = await deleteMealSlot(slot.id);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "Cannot modify meal slots for past days" });

    const stillThere = await prisma.mealSlot.findUnique({ where: { id: slot.id } });
    expect(stillThere).not.toBeNull();
  });
});
