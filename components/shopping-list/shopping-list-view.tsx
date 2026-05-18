"use client";

import { useState } from "react";
import useSWR from "swr";

import type { ShoppingListResponse } from "../../lib/types";
import { WeekNav } from "../meal-plan-grid/week-nav";
import { ShoppingListShareActions } from "./shopping-list-share-actions";

async function fetchShoppingList(url: string): Promise<ShoppingListResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load shopping list");
  }
  return response.json() as Promise<ShoppingListResponse>;
}

export function ShoppingListView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const swrKey = `/api/shopping-list?offset=${weekOffset}`;

  const { data, error, isLoading } = useSWR(swrKey, fetchShoppingList, {
    revalidateOnFocus: true,
  });

  const canGoPrev = weekOffset > -1;
  const canGoNext = weekOffset < 1;

  return (
    <section className="shopping-list-panel" data-testid="shopping-list">
      <WeekNav
        weekStart={data?.weekStart ?? ""}
        onPreviousWeek={() => setWeekOffset((offset) => Math.max(-1, offset - 1))}
        onCurrentWeek={() => setWeekOffset(0)}
        onNextWeek={() => setWeekOffset((offset) => Math.min(1, offset + 1))}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />

      {isLoading && <p className="text-sm text-muted">Loading shopping list…</p>}
      {error && (
        <p className="text-sm text-[var(--badge-warn-text)]" role="alert">
          Could not load shopping list.
        </p>
      )}

      {data && !isLoading && !error && (
        <>
          <ShoppingListShareActions weekStart={data.weekStart} items={data.items} />
          {data.items.length === 0 ? (
            <p className="surface-card px-4 py-6 text-center text-sm text-muted">
              No approved ingredients for this week. Approve ingredients on the meal plan,
              then return here.
            </p>
          ) : (
            <ul className="surface-card divide-y divide-[var(--color-border)] print-list">
              {data.items.map((item) => (
                <li
                  key={item.toLowerCase()}
                  className="px-4 py-3 text-sm font-medium print-list-item"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
          <p className="no-print mt-3 text-xs text-muted">
            {data.items.length} item{data.items.length === 1 ? "" : "s"} · week of{" "}
            {data.weekStart}
          </p>
        </>
      )}
    </section>
  );
}
