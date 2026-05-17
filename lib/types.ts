export type IngredientsStatus = "PENDING" | "READY" | "FAILED" | "EMPTY";

export type MealPlanIngredient = {
  id: string;
  name: string;
  approved: boolean;
};

export type MealPlanMealType = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MealPlanSlot = {
  id: string;
  mealTypeConfigId: string;
  mealTypeName: string;
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
  mealTypes: MealPlanMealType[];
  days: MealPlanDay[];
};

export type MealTypeConfig = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
};

export type MealTypesResponse = {
  mealTypes: MealTypeConfig[];
};
