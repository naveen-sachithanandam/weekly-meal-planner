import type { MealPlanMealType, MealPlanSlot } from "../../lib/types";

export const DEFAULT_MEAL_TYPES: MealPlanMealType[] = [
  { id: "cfg-breakfast", name: "BREAKFAST", sortOrder: 1 },
  { id: "cfg-lunch", name: "LUNCH", sortOrder: 2 },
  { id: "cfg-dinner", name: "DINNER", sortOrder: 3 },
];

export function mealTypeByName(name: string): MealPlanMealType {
  const mealType = DEFAULT_MEAL_TYPES.find((entry) => entry.name === name);
  if (!mealType) {
    throw new Error(`Unknown meal type: ${name}`);
  }
  return mealType;
}

export function buildSlot(overrides: Partial<MealPlanSlot> = {}): MealPlanSlot {
  return {
    id: "slot-1",
    mealTypeConfigId: "cfg-lunch",
    mealTypeName: "LUNCH",
    mealName: "Sambar rice",
    isToddlerAppropriate: true,
    ingredientsStatus: "EMPTY",
    ingredients: [],
    ...overrides,
  };
}
