"use client";

import { useEffect, useState } from "react";

import type { MealTypeConfig } from "../../lib/types";

type MealTypeRowProps = {
  mealType: MealTypeConfig;
  isLastActive: boolean;
  onUpdated: () => void | Promise<unknown>;
  dragHandleProps?: React.ComponentPropsWithoutRef<"button">;
  dragHandleRef?: (node: HTMLButtonElement | null) => void;
  isDragging?: boolean;
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: React.CSSProperties;
};

export function MealTypeRow({
  mealType,
  isLastActive,
  onUpdated,
  dragHandleProps,
  dragHandleRef,
  isDragging = false,
  sortableRef,
  sortableStyle,
}: MealTypeRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(mealType.name);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setName(mealType.name);
    }
  }, [mealType.name, isEditing]);

  function startEditing() {
    setName(mealType.name);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setName(mealType.name);
    setError(null);
    setIsEditing(false);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("name is required");
      return;
    }

    if (trimmed === mealType.name) {
      cancelEditing();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/configuration/meal-types/${mealType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to rename meal type");
        return;
      }

      setIsEditing(false);
      await onUpdated();
    } catch {
      setError("Failed to rename meal type");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleActive() {
    if (mealType.isActive && isLastActive) {
      return;
    }

    setIsTogglingActive(true);
    setError(null);

    try {
      const response = await fetch(`/api/configuration/meal-types/${mealType.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !mealType.isActive }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update meal type");
        return;
      }

      await onUpdated();
    } catch {
      setError("Failed to update meal type");
    } finally {
      setIsTogglingActive(false);
    }
  }

  async function deleteMealType() {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/configuration/meal-types/${mealType.id}`, {
        method: "DELETE",
      });

      if (response.status === 409) {
        const body = (await response.json()) as { error?: string };
        setError(
          body.error ??
            "Cannot delete a meal type that has meal slots. Deactivate it instead.",
        );
        return;
      }

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete meal type");
        return;
      }

      await onUpdated();
    } catch {
      setError("Failed to delete meal type");
    } finally {
      setIsDeleting(false);
    }
  }

  const isBusy = isSubmitting || isTogglingActive || isDeleting;

  return (
    <li
      ref={sortableRef}
      style={sortableStyle}
      data-testid="meal-type-row"
      data-active={mealType.isActive}
      className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        mealType.isActive ? "" : "bg-gray-50 text-gray-500"
      } ${isDragging ? "relative z-10 bg-white shadow-md ring-1 ring-gray-200" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {dragHandleProps && (
          <button
            ref={dragHandleRef}
            type="button"
            className="mt-0.5 shrink-0 cursor-grab rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 active:cursor-grabbing"
            aria-label={`Reorder ${mealType.name}`}
            {...dragHandleProps}
          >
            ⋮⋮
          </button>
        )}
        <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveName();
                }
                if (event.key === "Escape") {
                  cancelEditing();
                }
              }}
              disabled={isBusy}
              autoFocus
              aria-label="Meal type name"
              className="min-w-[10rem] flex-1 rounded border border-gray-300 px-3 py-1.5 text-base text-gray-900"
            />
            <button
              type="button"
              onClick={() => void saveName()}
              disabled={isBusy}
              className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isBusy}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="text-left font-medium hover:underline"
          >
            {mealType.name}
          </button>
        )}
        {!mealType.isActive && !isEditing && (
          <span className="ml-2 text-xs uppercase tracking-wide text-gray-400">
            Inactive
          </span>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <span className="text-sm text-gray-600">Position {mealType.sortOrder}</span>
        <button
          type="button"
          onClick={() => void toggleActive()}
          disabled={isBusy || (mealType.isActive && isLastActive)}
          title={
            mealType.isActive && isLastActive
              ? "At least one active meal type must exist"
              : undefined
          }
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isTogglingActive
            ? "Saving…"
            : mealType.isActive
              ? "Deactivate"
              : "Activate"}
        </button>
        <button
          type="button"
          onClick={() => void deleteMealType()}
          disabled={isBusy}
          className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </li>
  );
}
