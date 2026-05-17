import type { PrismaClient } from "@prisma/client";

const DEFAULT_MEAL_TYPES = [
  { name: "Breakfast", sortOrder: 1 },
  { name: "Lunch", sortOrder: 2 },
  { name: "Dinner", sortOrder: 3 },
] as const;

export type DefaultMealTypeName = (typeof DEFAULT_MEAL_TYPES)[number]["name"];

export type LegacyMealType = "BREAKFAST" | "LUNCH" | "DINNER";

const LEGACY_MEAL_TYPE_NAMES: Record<LegacyMealType, DefaultMealTypeName> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export async function seedDefaultMealTypeConfigs(prisma: PrismaClient) {
  for (const mealType of DEFAULT_MEAL_TYPES) {
    await prisma.mealTypeConfig.upsert({
      where: { name: mealType.name },
      create: mealType,
      update: {},
    });
  }
}

export async function getMealTypeConfigId(
  prisma: PrismaClient,
  name: DefaultMealTypeName,
) {
  const config = await prisma.mealTypeConfig.findUniqueOrThrow({
    where: { name },
  });
  return config.id;
}

export async function getLegacyMealTypeConfigId(
  prisma: PrismaClient,
  mealType: LegacyMealType,
) {
  return getMealTypeConfigId(prisma, LEGACY_MEAL_TYPE_NAMES[mealType]);
}
