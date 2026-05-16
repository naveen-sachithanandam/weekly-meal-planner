import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Toronto */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

async function getMealPlan(search = "") {
  const { GET } = await import("../../app/api/meal-plan/route");
  const request = new NextRequest(
    `http://localhost/api/meal-plan${search}`,
  );
  return GET(request);
}

describe("GET /api/meal-plan", () => {
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

  it("returns the current week when no week query is provided", async () => {
    const response = await getMealPlan();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weekStart).toBe("2026-05-10");
    expect(body.days).toHaveLength(7);
    expect(body.days.map((day: { date: string }) => day.date)).toEqual([
      "2026-05-10",
      "2026-05-11",
      "2026-05-12",
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
      "2026-05-16",
    ]);
  });

  it("returns a week for the given offset query", async () => {
    const response = await getMealPlan("?offset=1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weekStart).toBe("2026-05-17");
    expect(body.days[0].date).toBe("2026-05-17");
    expect(body.days[6].date).toBe("2026-05-23");
  });

  it("returns a specific week when the week query is provided", async () => {
    const response = await getMealPlan("?week=2025-01-05");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weekStart).toBe("2025-01-05");
    expect(body.days[0].date).toBe("2025-01-05");
    expect(body.days[6].date).toBe("2025-01-11");
  });

  it("returns empty slot lists for a week with no saved meals", async () => {
    const response = await getMealPlan("?week=2025-01-05");
    const body = await response.json();

    expect(body.days.every((day: { slots: unknown[] }) => day.slots.length === 0)).toBe(
      true,
    );
  });

  it("includes meal slots and ingredients for the requested week", async () => {
    const prisma = getTestPrisma();
    await prisma.mealSlot.create({
      data: {
        date: "2025-01-05",
        mealType: "BREAKFAST",
        mealName: "Idli",
        ingredients: {
          create: [{ name: "Urad dal", approved: true }],
        },
      },
    });

    const response = await getMealPlan("?week=2025-01-05");
    const body = await response.json();
    const sunday = body.days.find(
      (day: { date: string }) => day.date === "2025-01-05",
    );

    expect(sunday.slots).toHaveLength(1);
    expect(sunday.slots[0]).toMatchObject({
      mealType: "BREAKFAST",
      mealName: "Idli",
      ingredientsStatus: "PENDING",
    });
    expect(sunday.slots[0].ingredients).toEqual([
      expect.objectContaining({ name: "Urad dal", approved: true }),
    ]);
  });

  it("marks days before today as past", async () => {
    const response = await getMealPlan();
    const body = await response.json();

    const wednesday = body.days.find(
      (day: { date: string }) => day.date === "2026-05-13",
    );
    const thursday = body.days.find(
      (day: { date: string }) => day.date === "2026-05-14",
    );

    expect(wednesday.isPast).toBe(true);
    expect(thursday.isPast).toBe(false);
  });

  it("marks weekend days as toddler home by default", async () => {
    const response = await getMealPlan();
    const body = await response.json();

    expect(
      body.days.find((day: { date: string }) => day.date === "2026-05-10")
        .isToddlerHome,
    ).toBe(true);
    expect(
      body.days.find((day: { date: string }) => day.date === "2026-05-16")
        .isToddlerHome,
    ).toBe(true);
    expect(
      body.days.find((day: { date: string }) => day.date === "2026-05-12")
        .isToddlerHome,
    ).toBe(false);
  });

  it("honours toddler overrides in the week response", async () => {
    const prisma = getTestPrisma();
    await prisma.toddlerOverride.create({
      data: { date: "2026-05-12", isHome: true },
    });

    const response = await getMealPlan();
    const body = await response.json();
    const monday = body.days.find(
      (day: { date: string }) => day.date === "2026-05-12",
    );

    expect(monday.isToddlerHome).toBe(true);
  });
});
