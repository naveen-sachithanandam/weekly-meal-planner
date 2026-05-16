export type IngredientsStatus = "PENDING" | "READY" | "FAILED" | "EMPTY";

export type MealPlanIngredient = {
  id: string;
  name: string;
  approved: boolean;
};

export type MealPlanSlot = {
  id: string;
  mealType: string;
  mealName: string;
  isToddlerAppropriate: boolean;
  ingredientsStatus: IngredientsStatus;
  ingredients: MealPlanIngredient[];
};

export type MealPlanDay = {
  date: string;
  isToddlerHome: boolean;
  isPast: boolean;
  slots: MealPlanSlot[];
};

export type MealPlanResponse = {
  weekStart: string;
  days: MealPlanDay[];
};
