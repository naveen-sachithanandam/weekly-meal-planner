"use client";

import { useState } from "react";

type AddMealTypeFormProps = {
  onAdded: () => void | Promise<unknown>;
};

export function AddMealTypeForm({ onAdded }: AddMealTypeFormProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/configuration/meal-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to add meal type");
        return;
      }

      setName("");
      await onAdded();
    } catch {
      setError("Failed to add meal type");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 flex flex-wrap items-end gap-2"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-gray-700">
        New meal type
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          disabled={isSubmitting}
          className="rounded border border-gray-300 px-3 py-2 text-base text-gray-900"
          placeholder="Evening Snack"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting ? "Adding…" : "Add"}
      </button>
      {error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
