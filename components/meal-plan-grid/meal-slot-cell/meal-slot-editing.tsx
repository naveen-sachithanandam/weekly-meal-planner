"use client";

import { useState } from "react";

type MealSlotEditingProps = {
  date: string;
  mealTypeConfigId: string;
  slotId?: string;
  initialMealName?: string;
  initialIsToddlerAppropriate?: boolean;
  onSaved: () => void | Promise<unknown>;
  onCancel: () => void;
};

export function MealSlotEditing({
  date,
  mealTypeConfigId,
  slotId,
  initialMealName = "",
  initialIsToddlerAppropriate = false,
  onSaved,
  onCancel,
}: MealSlotEditingProps) {
  const [mealName, setMealName] = useState(initialMealName);
  const [isToddlerAppropriate, setIsToddlerAppropriate] = useState(
    initialIsToddlerAppropriate,
  );
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
      const isUpdate = slotId !== undefined;
      const response = await fetch(
        isUpdate ? `/api/meal-slots/${slotId}` : "/api/meal-slots",
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isUpdate ? {} : { date, mealTypeConfigId }),
            mealName: trimmed,
            isToddlerAppropriate,
          }),
        },
      );

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
      className="surface-card flex flex-col gap-2 p-2"
    >
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text)]">
        Meal name
        <input
          type="text"
          value={mealName}
          onChange={(event) => setMealName(event.target.value)}
          disabled={isSubmitting}
          className="rounded border border-[var(--color-border)] px-2 py-2 text-base text-[var(--color-text)] sm:py-1 sm:text-xs"
          autoFocus
        />
      </label>

      <label className="flex min-h-11 items-center gap-2 text-xs text-[var(--color-text)] sm:min-h-0">
        <input
          type="checkbox"
          checked={isToddlerAppropriate}
          onChange={(event) => setIsToddlerAppropriate(event.target.checked)}
          disabled={isSubmitting}
          className="size-4 shrink-0"
        />
        Toddler-appropriate?
      </label>

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-accent w-full px-3 py-2.5 text-sm disabled:opacity-50 sm:w-auto sm:py-1 sm:text-xs"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-neutral w-full px-3 py-2.5 text-sm disabled:opacity-50 sm:w-auto sm:py-1 sm:text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
