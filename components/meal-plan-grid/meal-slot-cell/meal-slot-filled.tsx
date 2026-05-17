"use client";

import { useState } from "react";

import type { IngredientsStatus, MealPlanIngredient } from "../../../lib/types";
import { IngredientList } from "./ingredient-list";
import { IngredientLoading } from "./ingredient-loading";
import { StatusBadge } from "./status-badge";

type MealSlotFilledProps = {
  slotId: string;
  mealName: string;
  ingredientsStatus: IngredientsStatus;
  ingredients: MealPlanIngredient[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStartEditing: () => void;
  onMutate?: () => void | Promise<unknown>;
};

const DELETE_CONFIRM_MESSAGE = "Remove this meal?";

export function MealSlotFilled({
  slotId,
  mealName,
  ingredientsStatus,
  ingredients,
  isExpanded,
  onToggleExpand,
  onStartEditing,
  onMutate,
}: MealSlotFilledProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnavailable =
    ingredientsStatus === "FAILED" || ingredientsStatus === "EMPTY";

  async function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();
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

  function handleEdit(event: React.MouseEvent) {
    event.stopPropagation();
    onStartEditing();
  }

  return (
    <div className="surface-card px-2 py-2">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={isExpanded}
          aria-label={`${mealName}, ${isExpanded ? "collapse" : "expand"} ingredients`}
        >
          <span className="truncate text-xs font-medium">{mealName}</span>
          <StatusBadge
            ingredientsStatus={ingredientsStatus}
            ingredientCount={ingredients.length}
          />
        </button>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={handleEdit}
            disabled={isDeleting}
            aria-label="Edit meal"
            className="btn-neutral px-2 py-0.5 text-xs disabled:opacity-50"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={(event) => void handleDelete(event)}
            disabled={isDeleting}
            aria-label="Delete meal"
            className="btn-danger px-2 py-0.5 text-xs disabled:opacity-50"
          >
            {isDeleting ? "…" : "✕"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-[var(--badge-warn-text)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="ingredient-panel" data-expanded={isExpanded}>
        <div className="ingredient-panel-inner">
          <div className="border-t border-[var(--color-border)] pt-2">
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
              <div>
                <p className="text-xs text-[var(--badge-warn-text)]">
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
        </div>
      </div>
    </div>
  );
}
