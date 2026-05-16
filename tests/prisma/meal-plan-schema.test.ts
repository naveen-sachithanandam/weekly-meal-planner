import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyValidEnv } from "../helpers/env";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

describe("meal plan database schema", () => {
  beforeEach(async () => {
    applyValidEnv();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  it("persists a meal slot with plan defaults", async () => {
    const prisma = getTestPrisma();

    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-01-05",
        mealType: "BREAKFAST",
        mealName: "Idli",
      },
    });

    expect(slot.isToddlerAppropriate).toBe(false);
    expect(slot.ingredientsStatus).toBe("PENDING");
  });

  it("allows only one meal slot per date and meal type", async () => {
    const prisma = getTestPrisma();

    await prisma.mealSlot.create({
      data: {
        date: "2026-01-05",
        mealType: "LUNCH",
        mealName: "Sambar rice",
      },
    });

    await expect(
      prisma.mealSlot.create({
        data: {
          date: "2026-01-05",
          mealType: "LUNCH",
          mealName: "Rasam rice",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("cascade-deletes ingredients when a meal slot is removed", async () => {
    const prisma = getTestPrisma();

    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-01-06",
        mealType: "DINNER",
        mealName: "Chapati",
        ingredients: {
          create: [{ name: "Wheat flour" }, { name: "Oil" }],
        },
      },
      include: { ingredients: true },
    });

    await prisma.mealSlot.delete({ where: { id: slot.id } });

    const remaining = await prisma.ingredient.findMany({
      where: { mealSlotId: slot.id },
    });

    expect(remaining).toHaveLength(0);
  });

  it("allows only one toddler override per calendar date", async () => {
    const prisma = getTestPrisma();

    await prisma.toddlerOverride.create({
      data: { date: "2026-01-07", isHome: true },
    });

    await expect(
      prisma.toddlerOverride.create({
        data: { date: "2026-01-07", isHome: false },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("stores ingredient approval state on a meal slot", async () => {
    const prisma = getTestPrisma();

    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-01-08",
        mealType: "BREAKFAST",
        mealName: "Poha",
        ingredients: {
          create: [{ name: "Poha", approved: true }],
        },
      },
      include: { ingredients: true },
    });

    expect(slot.ingredients).toHaveLength(1);
    expect(slot.ingredients[0]?.approved).toBe(true);
  });
});
