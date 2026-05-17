type MealSlotWithConfig = {
  id: string;
  date: string;
  mealTypeConfigId: string;
  mealName: string;
  isToddlerAppropriate: boolean;
  ingredientsStatus: string;
  mealTypeConfig: { name: string };
  ingredients: { id: string; name: string; approved: boolean }[];
};

export function serializeMealSlot(slot: MealSlotWithConfig) {
  return {
    id: slot.id,
    date: slot.date,
    mealTypeConfigId: slot.mealTypeConfigId,
    mealTypeName: slot.mealTypeConfig.name,
    mealName: slot.mealName,
    isToddlerAppropriate: slot.isToddlerAppropriate,
    ingredientsStatus: slot.ingredientsStatus,
    ingredients: slot.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      approved: ingredient.approved,
    })),
  };
}

export const mealSlotInclude = {
  mealTypeConfig: true,
  ingredients: true,
} as const;
