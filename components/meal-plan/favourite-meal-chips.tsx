"use client";

import type { FavoriteMeal } from "@prisma/client";
import { useMemo } from "react";
import useSWR from "swr";

const FAVOURITES_API_PATH = "/api/favourites" as const;

async function favouritesFetcher(url: string): Promise<FavoriteMeal[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Could not load favourite meals.");
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid favourite meals response.");
  }
  return data as FavoriteMeal[];
}

function categoryHeading(category: string | null): string {
  const t = category?.trim();
  return t !== undefined && t !== null && t.length > 0 ? t : "Other";
}

export interface FavouriteMealChipsProps {
  onSelect: (meal: FavoriteMeal) => void;
  /** `FavoriteMeal.id` of the highlighted chip, if any. */
  selected?: string;
}

/**
 * Horizontally scrollable favourite chips, grouped by category (SPEC.md pick list).
 */
export function FavouriteMealChips({ onSelect, selected }: FavouriteMealChipsProps) {
  const { data, error, isLoading } = useSWR(FAVOURITES_API_PATH, favouritesFetcher);

  const groups = useMemo(() => {
    if (!data?.length) return [] as { heading: string; meals: FavoriteMeal[] }[];
    const map = new Map<string, FavoriteMeal[]>();
    for (const meal of data) {
      const key = categoryHeading(meal.category);
      const list = map.get(key);
      if (list) list.push(meal);
      else map.set(key, [meal]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map(([heading, meals]) => ({ heading, meals }));
  }, [data]);

  if (isLoading) {
    return (
      <p className="text-sm text-text-muted" role="status">
        Loading favourites…
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error" role="alert">
        {error instanceof Error ? error.message : "Could not load favourites."}
      </p>
    );
  }

  if (!data?.length) {
    return <p className="text-sm text-text-muted">No favourite meals yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4" aria-label="Favourite meals">
      {groups.map(({ heading, meals }) => (
        <div key={heading}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{heading}</p>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {meals.map((meal) => {
              const isSelected = selected !== undefined && meal.id === selected;
              return (
                <button
                  key={meal.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(meal)}
                  className={`max-w-[11rem] shrink-0 truncate rounded-full px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-brand text-white"
                      : "bg-surface-muted text-text-secondary hover:bg-brand-surface hover:text-text-primary"
                  }`}
                  title={meal.name}
                >
                  {meal.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
