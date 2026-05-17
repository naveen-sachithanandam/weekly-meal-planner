import type { IngredientsStatus, MealPlanIngredient } from "../../../lib/types";
import { StatusBadge } from "./status-badge";

type MealSlotPastProps = {
  mealName: string;
  ingredientsStatus: IngredientsStatus;
  ingredients: MealPlanIngredient[];
};

export function MealSlotPast({
  mealName,
  ingredientsStatus,
  ingredients,
}: MealSlotPastProps) {
  const showBadge =
    ingredientsStatus === "READY" ||
    ingredientsStatus === "PENDING" ||
    ingredientsStatus === "FAILED" ||
    ingredientsStatus === "EMPTY";

  return (
    <div className="surface-card flex items-center justify-between gap-2 px-2 py-2">
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{mealName}</span>
      {showBadge ? (
        <StatusBadge
          ingredientsStatus={ingredientsStatus}
          ingredientCount={ingredients.length}
        />
      ) : null}
    </div>
  );
}
