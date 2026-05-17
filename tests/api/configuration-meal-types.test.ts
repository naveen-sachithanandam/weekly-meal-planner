import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv } from "../helpers/env";
import { getLegacyMealTypeConfigId } from "../helpers/meal-type-config";
import { getTestPrisma, resetTestDatabase } from "../helpers/prisma";

async function getMealTypes() {
  const { GET } = await import("../../app/api/configuration/meal-types/route");
  return GET();
}

async function postMealType(body: Record<string, unknown>) {
  const { POST } = await import("../../app/api/configuration/meal-types/route");
  const request = new NextRequest(
    "http://localhost/api/configuration/meal-types",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return POST(request);
}

async function patchMealType(id: string, body: Record<string, unknown>) {
  const { PATCH } = await import(
    "../../app/api/configuration/meal-types/[id]/route"
  );
  const request = new NextRequest(
    `http://localhost/api/configuration/meal-types/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return PATCH(request, { params: Promise.resolve({ id }) });
}

async function deleteMealType(id: string) {
  const { DELETE } = await import(
    "../../app/api/configuration/meal-types/[id]/route"
  );
  const request = new NextRequest(
    `http://localhost/api/configuration/meal-types/${id}`,
    { method: "DELETE" },
  );
  return DELETE(request, { params: Promise.resolve({ id }) });
}

async function reorderMealTypes(order: string[]) {
  const { PATCH } = await import(
    "../../app/api/configuration/meal-types/reorder/route"
  );
  const request = new NextRequest(
    "http://localhost/api/configuration/meal-types/reorder",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    },
  );
  return PATCH(request);
}

describe("GET /api/configuration/meal-types", () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.resetModules();
  });

  it("returns all meal types ordered by sortOrder with isActive", async () => {
    const response = await getMealTypes();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mealTypes).toEqual([
      expect.objectContaining({
        id: expect.any(String),
        name: "Breakfast",
        sortOrder: 1,
        isActive: true,
      }),
      expect.objectContaining({
        id: expect.any(String),
        name: "Lunch",
        sortOrder: 2,
        isActive: true,
      }),
      expect.objectContaining({
        id: expect.any(String),
        name: "Dinner",
        sortOrder: 3,
        isActive: true,
      }),
    ]);
  });

  it("includes inactive meal types", async () => {
    const prisma = getTestPrisma();
    await prisma.mealTypeConfig.create({
      data: { name: "Supper", sortOrder: 4, isActive: false },
    });

    const response = await getMealTypes();
    const body = await response.json();

    expect(body.mealTypes).toHaveLength(4);
    expect(body.mealTypes[3]).toMatchObject({
      name: "Supper",
      sortOrder: 4,
      isActive: false,
    });
  });

  it("returns meal types in sortOrder ascending", async () => {
    const prisma = getTestPrisma();
    await prisma.mealTypeConfig.create({
      data: { name: "Brunch", sortOrder: 0, isActive: true },
    });

    const response = await getMealTypes();
    const body = await response.json();

    expect(body.mealTypes.map((type: { name: string }) => type.name)).toEqual([
      "Brunch",
      "Breakfast",
      "Lunch",
      "Dinner",
    ]);
  });

  it("returns an empty list when no meal types exist", async () => {
    const prisma = getTestPrisma();
    await prisma.mealTypeConfig.deleteMany();

    const response = await getMealTypes();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ mealTypes: [] });
  });
});

describe("POST /api/configuration/meal-types", () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.resetModules();
  });

  it("creates a meal type with sortOrder max + 1 and isActive true", async () => {
    const response = await postMealType({ name: "Evening Snack" });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      id: expect.any(String),
      name: "Evening Snack",
      sortOrder: 4,
      isActive: true,
    });
  });

  it("appends the new meal type at the bottom of GET results", async () => {
    await postMealType({ name: "Evening Snack" });

    const response = await getMealTypes();
    const body = await response.json();

    expect(body.mealTypes).toHaveLength(4);
    expect(body.mealTypes[3]).toMatchObject({
      name: "Evening Snack",
      sortOrder: 4,
      isActive: true,
    });
  });

  it("includes a new meal type on the meal plan grid after reload", async () => {
    applyValidEnv();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T16:00:00.000Z"));
    vi.resetModules();

    const createResponse = await postMealType({ name: "Evening Snack" });
    const created = await createResponse.json();

    const { GET: getMealPlan } = await import("../../app/api/meal-plan/route");
    const mealPlanResponse = await getMealPlan(
      new NextRequest("http://localhost/api/meal-plan?week=2025-01-05"),
    );
    const mealPlan = await mealPlanResponse.json();

    expect(mealPlan.mealTypes).toHaveLength(4);
    expect(mealPlan.mealTypes[3]).toMatchObject({
      id: created.id,
      name: "Evening Snack",
      sortOrder: 4,
    });

    vi.useRealTimers();
  });

  it("uses max sortOrder + 1 when sort orders have gaps", async () => {
    const prisma = getTestPrisma();
    await prisma.mealTypeConfig.create({
      data: { name: "Brunch", sortOrder: 10, isActive: true },
    });

    const response = await postMealType({ name: "Evening Snack" });
    const body = await response.json();

    expect(body.sortOrder).toBe(11);
  });

  it("returns 400 when name is blank", async () => {
    const response = await postMealType({ name: "   " });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "name is required" });
  });

  it("returns 400 when name is missing", async () => {
    const response = await postMealType({});
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "name is required" });
  });

  it("returns 409 when name duplicates an existing meal type", async () => {
    const response = await postMealType({ name: "Breakfast" });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "A meal type with this name already exists",
    });
  });

  it("returns 409 for case-insensitive duplicate names", async () => {
    const response = await postMealType({ name: "breakfast" });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "A meal type with this name already exists",
    });
  });
});

describe("PATCH /api/configuration/meal-types/[id]", () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.resetModules();
  });

  it("updates the meal type name and returns the record", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    const response = await patchMealType(dinnerId, { name: "Main Meal" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: dinnerId,
      name: "Main Meal",
      sortOrder: 3,
      isActive: true,
    });
  });

  it("reflects the renamed meal type in GET results", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    await patchMealType(dinnerId, { name: "Main Meal" });

    const response = await getMealTypes();
    const body = await response.json();

    expect(body.mealTypes[2]).toMatchObject({
      id: dinnerId,
      name: "Main Meal",
    });
  });

  it("leaves existing meal slots linked by mealTypeConfigId with updated grid name", async () => {
    applyValidEnv();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T16:00:00.000Z"));
    vi.resetModules();

    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    await prisma.mealSlot.create({
      data: {
        date: "2025-01-05",
        mealTypeConfigId: breakfastId,
        mealName: "Oatmeal",
      },
    });

    await patchMealType(breakfastId, { name: "Morning Meal" });

    const slot = await prisma.mealSlot.findFirstOrThrow({
      where: { mealTypeConfigId: breakfastId },
    });
    expect(slot.mealTypeConfigId).toBe(breakfastId);
    expect(slot.mealName).toBe("Oatmeal");

    const { GET: getMealPlan } = await import("../../app/api/meal-plan/route");
    const mealPlanResponse = await getMealPlan(
      new NextRequest("http://localhost/api/meal-plan?week=2025-01-05"),
    );
    const mealPlan = await mealPlanResponse.json();
    const sunday = mealPlan.days.find(
      (day: { date: string }) => day.date === "2025-01-05",
    );

    expect(mealPlan.mealTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: breakfastId, name: "Morning Meal" }),
      ]),
    );
    expect(sunday.slots[0]).toMatchObject({
      mealTypeConfigId: breakfastId,
      mealTypeName: "Morning Meal",
      mealName: "Oatmeal",
    });

    vi.useRealTimers();
  });

  it("allows renaming to the same name with different casing", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");

    const response = await patchMealType(lunchId, { name: "lunch" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("lunch");
  });

  it("returns 400 when name is blank", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");

    const response = await patchMealType(lunchId, { name: "   " });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "name cannot be empty" });
  });

  it("returns 409 when name duplicates another meal type", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    const response = await patchMealType(dinnerId, { name: "Breakfast" });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "A meal type with this name already exists",
    });
  });

  it("returns 409 for case-insensitive duplicate names", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    const response = await patchMealType(dinnerId, { name: "breakfast" });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: "A meal type with this name already exists",
    });
  });

  it("returns 404 for an unknown meal type id", async () => {
    const response = await patchMealType("nonexistent-id", { name: "Snack" });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Meal type not found" });
  });

  it("returns 400 when no fields are provided", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");

    const response = await patchMealType(lunchId, {});
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "At least one of name, sortOrder, or isActive is required",
    });
  });

  it("deactivates a meal type when it is not the last active one", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    const response = await patchMealType(dinnerId, { isActive: false });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: dinnerId,
      name: "Dinner",
      isActive: false,
    });
  });

  it("excludes a deactivated meal type from the meal plan grid", async () => {
    applyValidEnv();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T16:00:00.000Z"));
    vi.resetModules();

    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    await patchMealType(dinnerId, { isActive: false });

    const { GET: getMealPlan } = await import("../../app/api/meal-plan/route");
    const mealPlanResponse = await getMealPlan(
      new NextRequest("http://localhost/api/meal-plan?week=2025-01-05"),
    );
    const mealPlan = await mealPlanResponse.json();

    expect(mealPlan.mealTypes).toHaveLength(2);
    expect(mealPlan.mealTypes.map((type: { name: string }) => type.name)).toEqual([
      "Breakfast",
      "Lunch",
    ]);

    vi.useRealTimers();
  });

  it("preserves meal slots in the database when a meal type is deactivated", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    await prisma.mealSlot.create({
      data: {
        date: "2025-01-05",
        mealTypeConfigId: dinnerId,
        mealName: "Pasta",
      },
    });

    await patchMealType(dinnerId, { isActive: false });

    const slot = await prisma.mealSlot.findFirstOrThrow({
      where: { mealTypeConfigId: dinnerId },
    });
    expect(slot.mealName).toBe("Pasta");
    expect(slot.mealTypeConfigId).toBe(dinnerId);
  });

  it("reactivates an inactive meal type", async () => {
    const prisma = getTestPrisma();
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");
    await patchMealType(dinnerId, { isActive: false });

    const response = await patchMealType(dinnerId, { isActive: true });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.isActive).toBe(true);
  });

  it("returns 400 when deactivating the last active meal type", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    await patchMealType(breakfastId, { isActive: false });
    await patchMealType(lunchId, { isActive: false });

    const response = await patchMealType(dinnerId, { isActive: false });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "At least one active meal type must exist",
    });
  });

  it("returns 400 when isActive is not a boolean", async () => {
    const prisma = getTestPrisma();
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");

    const response = await patchMealType(lunchId, { isActive: "false" });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "isActive must be a boolean" });
  });
});

describe("DELETE /api/configuration/meal-types/[id]", () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.resetModules();
  });

  it("returns 204 when the meal type has no linked slots", async () => {
    const prisma = getTestPrisma();
    const snack = await prisma.mealTypeConfig.create({
      data: { name: "Evening Snack", sortOrder: 4, isActive: true },
    });

    const response = await deleteMealType(snack.id);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");

    const deleted = await prisma.mealTypeConfig.findUnique({
      where: { id: snack.id },
    });
    expect(deleted).toBeNull();
  });

  it("removes the meal type from GET results after delete", async () => {
    const prisma = getTestPrisma();
    const snack = await prisma.mealTypeConfig.create({
      data: { name: "Evening Snack", sortOrder: 4, isActive: true },
    });

    await deleteMealType(snack.id);

    const response = await getMealTypes();
    const body = await response.json();

    expect(body.mealTypes).toHaveLength(3);
    expect(body.mealTypes.map((type: { name: string }) => type.name)).not.toContain(
      "Evening Snack",
    );
  });

  it("returns 409 when the meal type has linked meal slots", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    await prisma.mealSlot.create({
      data: {
        date: "2025-01-05",
        mealTypeConfigId: breakfastId,
        mealName: "Oatmeal",
      },
    });

    const response = await deleteMealType(breakfastId);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error:
        "Cannot delete a meal type that has meal slots. Deactivate it instead.",
    });

    const stillExists = await prisma.mealTypeConfig.findUnique({
      where: { id: breakfastId },
    });
    expect(stillExists).not.toBeNull();
  });

  it("returns 404 for an unknown meal type id", async () => {
    const response = await deleteMealType("nonexistent-id");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Meal type not found" });
  });
});

describe("PATCH /api/configuration/meal-types/reorder", () => {
  beforeEach(async () => {
    vi.resetModules();
    await resetTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
    vi.resetModules();
  });

  it("updates sortOrder for all meal types and returns the full list", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    const response = await reorderMealTypes([dinnerId, breakfastId, lunchId]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mealTypes).toEqual([
      expect.objectContaining({ id: dinnerId, name: "Dinner", sortOrder: 1 }),
      expect.objectContaining({ id: breakfastId, name: "Breakfast", sortOrder: 2 }),
      expect.objectContaining({ id: lunchId, name: "Lunch", sortOrder: 3 }),
    ]);
  });

  it("reflects the new order in GET results", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    await reorderMealTypes([dinnerId, breakfastId, lunchId]);

    const response = await getMealTypes();
    const body = await response.json();

    expect(body.mealTypes.map((type: { name: string }) => type.name)).toEqual([
      "Dinner",
      "Breakfast",
      "Lunch",
    ]);
  });

  it("reflects the new order in the meal plan grid", async () => {
    applyValidEnv();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T16:00:00.000Z"));
    vi.resetModules();

    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    await reorderMealTypes([dinnerId, breakfastId, lunchId]);

    const { GET: getMealPlan } = await import("../../app/api/meal-plan/route");
    const mealPlanResponse = await getMealPlan(
      new NextRequest("http://localhost/api/meal-plan?week=2025-01-05"),
    );
    const mealPlan = await mealPlanResponse.json();

    expect(mealPlan.mealTypes.map((type: { name: string }) => type.name)).toEqual([
      "Dinner",
      "Breakfast",
      "Lunch",
    ]);

    vi.useRealTimers();
  });

  it("returns 400 for an unknown meal type id", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");

    const response = await reorderMealTypes([breakfastId, lunchId, "nonexistent-id"]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid meal type id in order" });
  });

  it("returns 400 when order is missing", async () => {
    const { PATCH } = await import(
      "../../app/api/configuration/meal-types/reorder/route"
    );
    const request = new NextRequest(
      "http://localhost/api/configuration/meal-types/reorder",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "order must be an array" });
  });

  it("returns 400 when order omits an existing meal type", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");

    const response = await reorderMealTypes([breakfastId, lunchId]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: "order must include every meal type id exactly once",
    });
  });

  it("returns 400 when order contains duplicate ids", async () => {
    const prisma = getTestPrisma();
    const breakfastId = await getLegacyMealTypeConfigId(prisma, "BREAKFAST");
    const lunchId = await getLegacyMealTypeConfigId(prisma, "LUNCH");
    const dinnerId = await getLegacyMealTypeConfigId(prisma, "DINNER");

    const response = await reorderMealTypes([breakfastId, breakfastId, lunchId, dinnerId]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "order must not contain duplicate ids" });
  });
});
