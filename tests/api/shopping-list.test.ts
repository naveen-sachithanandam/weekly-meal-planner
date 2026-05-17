import { NextRequest } from "next/server";
import { addDays, format, parse } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";
import { getMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Chicago */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

function weekDates(weekStart: string): string[] {
  const start = parse(weekStart, "yyyy-MM-dd", new Date());
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), "yyyy-MM-dd"),
  );
}

async function getShoppingList(search = "") {
  const { GET } = await import("../../app/api/shopping-list/route");
  return GET(new NextRequest(`http://localhost/api/shopping-list${search}`));
}

describe("GET /api/shopping-list", () => {
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

  it("returns deduplicated approved ingredients for the week", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getMealTypeConfigId(prisma, "Breakfast");
    const lunchId = await getMealTypeConfigId(prisma, "Lunch");

    const weekStart = "2026-05-10";
    const dates = weekDates(weekStart);

    await prisma.mealSlot.create({
      data: {
        date: dates[0]!,
        mealTypeConfigId: breakfastId,
        mealName: "Oats",
        ingredientsStatus: "READY",
        ingredients: {
          create: [
            { name: "Rolled oats", approved: true },
            { name: "rolled oats", approved: true },
          ],
        },
      },
    });

    await prisma.mealSlot.create({
      data: {
        date: dates[1]!,
        mealTypeConfigId: lunchId,
        mealName: "Soup",
        ingredientsStatus: "READY",
        ingredients: {
          create: [
            { name: "Carrots", approved: true },
            { name: "Salt", approved: false },
          ],
        },
      },
    });

    const response = await getShoppingList("?week=2026-05-10");
    const body = (await response.json()) as { weekStart: string; items: string[] };

    expect(response.status).toBe(200);
    expect(body.weekStart).toBe("2026-05-10");
    expect(body.items).toEqual(["Carrots", "Rolled oats"]);
  });

  it("returns empty items when nothing is approved", async () => {
    const response = await getShoppingList("?offset=0");
    const body = (await response.json()) as { items: string[] };

    expect(body.items).toEqual([]);
  });
});
