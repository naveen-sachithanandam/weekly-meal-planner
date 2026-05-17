import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";
import { getLegacyMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

/** Thursday 2026-05-14 in America/Toronto */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

async function postToddlerOverride(body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/toddler-overrides/route");
  const request = new NextRequest("http://localhost/api/toddler-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/toddler-overrides", () => {
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

  it("saves toddler home override for a day with no planned meals", async () => {
    const response = await postToddlerOverride({
      date: "2026-05-12",
      isHome: true,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      override: { date: "2026-05-12", isHome: true },
      conflicts: [],
    });

    const prisma = getTestPrisma();
    const saved = await prisma.toddlerOverride.findUnique({
      where: { date: "2026-05-12" },
    });
    expect(saved).toMatchObject({ date: "2026-05-12", isHome: true });
  });

  it("returns conflicts without saving when isHome is true and meals are not toddler-appropriate", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const slot = await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: lunchId,
        mealName: "Misal pav",
        isToddlerAppropriate: false,
        ingredientsStatus: "EMPTY",
      },
    });

    const response = await postToddlerOverride({
      date: "2026-05-15",
      isHome: true,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      override: { date: "2026-05-15", isHome: true },
      conflicts: [
        {
          slotId: slot.id,
          mealTypeName: "Lunch",
          mealName: "Misal pav",
        },
      ],
    });

    const saved = await prisma.toddlerOverride.findUnique({
      where: { date: "2026-05-15" },
    });
    expect(saved).toBeNull();
  });

  it("saves the override when force is true despite conflicts", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    await prisma.mealSlot.create({
      data: {
        date: "2026-05-15",
        mealTypeConfigId: dinnerId,
        mealName: "Prawn masala",
        isToddlerAppropriate: false,
        ingredientsStatus: "EMPTY",
      },
    });

    const response = await postToddlerOverride({
      date: "2026-05-15",
      isHome: true,
      force: true,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      override: { date: "2026-05-15", isHome: true },
      conflicts: [],
    });

    const saved = await prisma.toddlerOverride.findUnique({
      where: { date: "2026-05-15" },
    });
    expect(saved).toMatchObject({ date: "2026-05-15", isHome: true });
  });

  it("does not check conflicts when isHome is false", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    await prisma.mealSlot.create({
      data: {
        date: "2026-05-12",
        mealTypeConfigId: lunchId,
        mealName: "Misal pav",
        isToddlerAppropriate: false,
        ingredientsStatus: "EMPTY",
      },
    });

    const response = await postToddlerOverride({
      date: "2026-05-12",
      isHome: false,
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      override: { date: "2026-05-12", isHome: false },
      conflicts: [],
    });

    const saved = await prisma.toddlerOverride.findUnique({
      where: { date: "2026-05-12" },
    });
    expect(saved).toMatchObject({ date: "2026-05-12", isHome: false });
  });

  it("returns validation errors for invalid request bodies", async () => {
    const response = await postToddlerOverride({ date: "bad", isHome: true });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "date must be YYYY-MM-DD" });
  });
});
