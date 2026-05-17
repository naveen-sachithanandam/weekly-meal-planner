import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";
import { getLegacyMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Chicago */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

async function patchMealSlotIngredients(
  slotId: string,
  body: Record<string, unknown>,
) {
  const { PATCH } = await import(
    "../../app/api/meal-slots/[id]/ingredients/route"
  );
  const request = new NextRequest(
    `http://localhost/api/meal-slots/${slotId}/ingredients`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return PATCH(request, { params: Promise.resolve({ id: slotId }) });
}

describe("PATCH /api/meal-slots/[id]/ingredients", () => {
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

  it("replaces all ingredients and sets the slot status to READY", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: breakfastId,
        mealName: "Idli",
        isToddlerAppropriate: true,
        ingredientsStatus: "PENDING",
        ingredients: {
          create: [
            { name: "idli rice", approved: false },
            { name: "urad dal", approved: false },
          ],
        },
      },
      include: { ingredients: true },
    });

    const response = await patchMealSlotIngredients(slot.id, {
      ingredients: [
        { id: slot.ingredients[0].id, name: "Rolled oats", approved: true },
        { id: "new-item", name: "Milk", approved: false },
      ],
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: slot.id,
      mealTypeConfigId: breakfastId,
      mealTypeName: "Breakfast",
      mealName: "Idli",
      ingredientsStatus: "READY",
    });
    expect(body.ingredients).toHaveLength(2);
    expect(body.ingredients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Rolled oats", approved: true }),
        expect.objectContaining({ name: "Milk", approved: false }),
      ]),
    );

    const stored = await prisma.mealSlot.findUniqueOrThrow({
      where: { id: slot.id },
      include: { ingredients: true },
    });
    expect(stored.ingredientsStatus).toBe("READY");
    expect(stored.ingredients.map((i) => i.name).sort()).toEqual([
      "Milk",
      "Rolled oats",
    ]);
    expect(
      stored.ingredients.some((i) => i.id === slot.ingredients[0].id),
    ).toBe(false);
  });
});
