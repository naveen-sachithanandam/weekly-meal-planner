"use client";

import { useEffect, useState } from "react";

import type { IngredientsStatus, MealPlanIngredient } from "../../../lib/types";

type IngredientListProps = {
  slotId: string;
  ingredients: MealPlanIngredient[];
  ingredientsStatus: IngredientsStatus;
  onMutate?: () => void | Promise<unknown>;
  showUnavailableMessage?: boolean;
};

type IngredientDraft = {
  id?: string;
  name: string;
  approved: boolean;
};

function toDrafts(ingredients: MealPlanIngredient[]): IngredientDraft[] {
  return ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    approved: ingredient.approved,
  }));
}

export function IngredientList({
  slotId,
  ingredients,
  ingredientsStatus,
  onMutate,
  showUnavailableMessage = true,
}: IngredientListProps) {
  const [drafts, setDrafts] = useState<IngredientDraft[]>(() => toDrafts(ingredients));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDrafts(toDrafts(ingredients));
    }
  }, [ingredients, isEditing]);
  const [manualName, setManualName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnavailable =
    ingredientsStatus === "FAILED" || ingredientsStatus === "EMPTY";

  async function saveIngredients(nextIngredients: IngredientDraft[]) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/meal-slots/${slotId}/ingredients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: nextIngredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.name.trim(),
            approved: ingredient.approved,
          })),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to save ingredients");
        return;
      }

      const body = (await response.json()) as {
        ingredients: MealPlanIngredient[];
      };
      setDrafts(toDrafts(body.ingredients));
      await onMutate?.();
    } catch {
      setError("Failed to save ingredients");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApprovalChange(index: number, approved: boolean) {
    const next = drafts.map((ingredient, ingredientIndex) =>
      ingredientIndex === index ? { ...ingredient, approved } : ingredient,
    );
    setDrafts(next);
    await saveIngredients(next);
  }

  function handleStartEditing() {
    setDrafts(toDrafts(ingredients));
    setIsEditing(true);
    setError(null);
  }

  function handleCancelEditing() {
    setDrafts(toDrafts(ingredients));
    setIsEditing(false);
    setError(null);
  }

  async function handleSaveEditing() {
    const trimmed = drafts
      .map((ingredient) => ({
        ...ingredient,
        name: ingredient.name.trim(),
      }))
      .filter((ingredient) => ingredient.name.length > 0);

    if (trimmed.length === 0) {
      setError("Add at least one ingredient");
      return;
    }

    await saveIngredients(trimmed);
    setIsEditing(false);
  }

  async function handleManualAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = manualName.trim();
    if (!trimmed) {
      return;
    }

    const next = [...drafts, { name: trimmed, approved: false }];
    setManualName("");
    await saveIngredients(next);
  }

  function handleDraftNameChange(index: number, name: string) {
    setDrafts((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, name } : ingredient,
      ),
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {showUnavailableMessage && isUnavailable ? (
        <p className="text-xs text-amber-700">
          Ingredients unavailable. Add manually.
        </p>
      ) : null}

      {drafts.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {drafts.map((ingredient, index) => (
            <li key={ingredient.id ?? `draft-${index}`} className="flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={ingredient.name}
                  onChange={(event) => handleDraftNameChange(index, event.target.value)}
                  disabled={isSaving}
                  aria-label={`Ingredient ${index + 1}`}
                  className="min-w-0 flex-1 rounded border border-gray-300 px-1 py-0.5 text-xs text-gray-900"
                />
              ) : (
                <>
                  <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={ingredient.approved}
                      onChange={(event) =>
                        void handleApprovalChange(index, event.target.checked)
                      }
                      disabled={isSaving}
                      aria-label={`Approve ${ingredient.name}`}
                    />
                    <span className="truncate">{ingredient.name}</span>
                  </label>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {!isUnavailable && drafts.length > 0 ? (
        isEditing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSaveEditing()}
              disabled={isSaving}
              className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handleCancelEditing}
              disabled={isSaving}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartEditing}
            disabled={isSaving}
            className="self-start text-xs text-gray-600 underline hover:text-gray-900 disabled:opacity-50"
          >
            Edit ingredients
          </button>
        )
      ) : null}

      {isUnavailable || isEditing ? (
        <form onSubmit={(event) => void handleManualAdd(event)} className="flex gap-2">
          <label className="sr-only" htmlFor={`manual-ingredient-${slotId}`}>
            Add ingredient
          </label>
          <input
            id={`manual-ingredient-${slotId}`}
            type="text"
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
            disabled={isSaving}
            placeholder="Ingredient name"
            className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
