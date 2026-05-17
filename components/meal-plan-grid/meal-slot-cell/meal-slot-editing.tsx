"use client";

import { useState } from "react";

type MealSlotEditingProps = {
  date: string;
  mealTypeConfigId: string;
  onSaved: () => void | Promise<unknown>;
  onCancel: () => void;
};

export function MealSlotEditing({
  date,
  mealTypeConfigId,
  onSaved,
  onCancel,
}: MealSlotEditingProps) {
  const [mealName, setMealName] = useState("");
  const [isToddlerAppropriate, setIsToddlerAppropriate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = mealName.trim();
    if (!trimmed) {
      setError("mealName is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/meal-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          mealTypeConfigId,
          mealName: trimmed,
          isToddlerAppropriate,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to save meal");
        return;
      }

      await onSaved();
      onCancel();
    } catch {
      setError("Failed to save meal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded border border-gray-300 bg-white p-2"
    >
      <label className="flex flex-col gap-1 text-xs text-gray-700">
        Meal name
        <input
          type="text"
          value={mealName}
          onChange={(event) => setMealName(event.target.value)}
          disabled={isSubmitting}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-900"
          autoFocus
        />
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input
          type="checkbox"
          checked={isToddlerAppropriate}
          onChange={(event) => setIsToddlerAppropriate(event.target.checked)}
          disabled={isSubmitting}
        />
        Toddler-appropriate?
      </label>

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
