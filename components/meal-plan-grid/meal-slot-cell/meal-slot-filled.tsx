"use client";

import type { IngredientsStatus, MealPlanIngredient } from "../../../lib/types";
import { IngredientList } from "./ingredient-list";
import { IngredientLoading } from "./ingredient-loading";

type MealSlotFilledProps = {
  slotId: string;
  mealName: string;
  ingredientsStatus: IngredientsStatus;
  ingredients: MealPlanIngredient[];
  onStartEditing: () => void;
  onMutate?: () => void | Promise<unknown>;
};

export function MealSlotFilled({
  slotId,
  mealName,
  ingredientsStatus,
  ingredients,
  onStartEditing,
  onMutate,
}: MealSlotFilledProps) {
  const isUnavailable =
    ingredientsStatus === "FAILED" || ingredientsStatus === "EMPTY";

  return (
    <div className="rounded border border-gray-200 bg-white px-2 py-2">
      <button
        type="button"
        onClick={onStartEditing}
        className="w-full text-left text-xs font-medium text-gray-900 hover:text-gray-700"
      >
        {mealName}
      </button>

      {ingredientsStatus === "PENDING" ? <IngredientLoading /> : null}

      {ingredientsStatus === "READY" ? (
        <IngredientList
          slotId={slotId}
          ingredients={ingredients}
          ingredientsStatus={ingredientsStatus}
          onMutate={onMutate}
        />
      ) : null}

      {isUnavailable ? (
        <div className="mt-2">
          <p className="text-xs text-amber-700">
            Ingredients unavailable. Add manually.
          </p>
          <IngredientList
            slotId={slotId}
            ingredients={ingredients}
            ingredientsStatus={ingredientsStatus}
            onMutate={onMutate}
            showUnavailableMessage={false}
          />
        </div>
      ) : null}
    </div>
  );
}
