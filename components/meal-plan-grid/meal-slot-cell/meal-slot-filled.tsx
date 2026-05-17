"use client";

import { useState } from "react";

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

const DELETE_CONFIRM_MESSAGE = "Remove this meal?";

export function MealSlotFilled({
  slotId,
  mealName,
  ingredientsStatus,
  ingredients,
  onStartEditing,
  onMutate,
}: MealSlotFilledProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnavailable =
    ingredientsStatus === "FAILED" || ingredientsStatus === "EMPTY";

  async function handleDelete() {
    const confirmed = window.confirm(DELETE_CONFIRM_MESSAGE);
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/meal-slots/${slotId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to remove meal");
        return;
      }

      await onMutate?.();
    } catch {
      setError("Failed to remove meal");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded border border-gray-200 bg-white px-2 py-2">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onStartEditing}
          className="min-w-0 flex-1 text-left text-xs font-medium text-gray-900 hover:text-gray-700"
        >
          {mealName}
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onStartEditing}
            disabled={isDeleting}
            aria-label="Edit meal"
            className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            aria-label="Delete meal"
            className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

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
