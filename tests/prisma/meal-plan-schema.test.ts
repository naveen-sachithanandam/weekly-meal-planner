import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyValidEnv } from "../helpers/env";
import {
  getMealTypeConfigId,
  seedDefaultMealTypeConfigs,
} from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

describe("meal plan database schema", () => {
  beforeEach(async () => {
    applyValidEnv();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  it("persists meal type configs with unique names", async () => {
    const prisma = getTestPrisma();

    const supper = await prisma.mealTypeConfig.create({
      data: { name: "Supper", sortOrder: 4 },
    });

    expect(supper.isActive).toBe(true);

    await expect(
      prisma.mealTypeConfig.create({
        data: { name: "Supper", sortOrder: 99 },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("persists a meal slot linked to a meal type config", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getMealTypeConfigId(prisma, "Breakfast");

    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-01-05",
        mealTypeConfigId: breakfastId,
        mealName: "Idli",
      },
    });

    expect(slot.isToddlerAppropriate).toBe(false);
    expect(slot.ingredientsStatus).toBe("PENDING");
  });

  it("allows only one meal slot per date and meal type config", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getMealTypeConfigId(prisma, "Lunch");

    await prisma.mealSlot.create({
      data: {
        date: "2026-01-05",
        mealTypeConfigId: lunchId,
        mealName: "Sambar rice",
      },
    });

    await expect(
      prisma.mealSlot.create({
        data: {
          date: "2026-01-05",
          mealTypeConfigId: lunchId,
          mealName: "Rasam rice",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("cascade-deletes ingredients when a meal slot is removed", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getMealTypeConfigId(prisma, "Dinner");

    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-01-06",
        mealTypeConfigId: dinnerId,
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
    const breakfastId = await getMealTypeConfigId(prisma, "Breakfast");

    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-01-08",
        mealTypeConfigId: breakfastId,
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

  it("seeds default meal types without duplicates on re-run", async () => {
    const prisma = getTestPrisma();

    await seedDefaultMealTypeConfigs(prisma);
    await seedDefaultMealTypeConfigs(prisma);

    const configs = await prisma.mealTypeConfig.findMany({
      orderBy: { sortOrder: "asc" },
    });

    expect(configs.map((config) => config.name)).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
    ]);
  });
});
