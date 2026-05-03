"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { WeekNav } from "@/components/meal-plan/week-nav";
import { AddShoppingItemSheet } from "@/components/shopping-list/add-shopping-item-sheet";
import {
  ShoppingChecklistView,
  ShoppingMealView,
  ShoppingSectionView,
  ShoppingViewTabs,
  type ShoppingViewMode,
} from "@/components/shopping-list/shopping-list-views";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { isShoppingListNotFoundError, useShoppingList } from "@/hooks/use-shopping-list";
import { useShoppingListMutations } from "@/hooks/use-shopping-list-mutations";
import {
  formatWeekLabel,
  formatWeekStartDateParam,
  getCurrentWeekStart,
  parseWeekStartDateString,
} from "@/lib/week-boundary";

/** Shopping list: week-aligned list with by-meal, by-section, and checklist views (SPEC.md + DESIGN). */
export default function ShoppingListPage() {
  const [weekStart, setWeekStart] = useState(() => formatWeekStartDateParam(getCurrentWeekStart()));
  const [view, setView] = useState<ShoppingViewMode>("checklist");
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, error, isLoading, isValidating } = useShoppingList(weekStart, {
    swr: { refreshInterval: 60_000 },
  });
  const {
    data: mealData,
    isLoading: mealLoading,
    error: mealError,
  } = useMealPlan(weekStart);

  const mutations = useShoppingListMutations(weekStart);

  const weekSubtitle = useMemo(() => {
    const p = parseWeekStartDateString(weekStart);
    return p !== null ? formatWeekLabel(p) : "Week";
  }, [weekStart]);

  const showInitialLoading = isLoading && data === undefined && error === undefined;
  const shoppingNotFound =
    data === undefined && error !== undefined && isShoppingListNotFoundError(error);
  const fatalShopping = error !== undefined && !shoppingNotFound;
  const hasChecked = data?.groups.some((g) => g.checked) ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WeekNav weekStart={weekStart} onWeekChange={setWeekStart} />

      <div className="sticky top-0 z-[10] border-b border-border bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-text-primary">Shopping List</h1>
            <p className="text-xs text-text-secondary">{weekSubtitle}</p>
          </div>
          {data !== undefined && hasChecked ? (
            <button
              type="button"
              disabled={mutations.busy}
              onClick={() => void mutations.clearAllChecks()}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-brand hover:text-text-primary disabled:opacity-50"
            >
              Clear checks
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 pt-3">
        <ShoppingViewTabs mode={view} onModeChange={setView} />
      </div>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4">
        {mutations.error !== null ? (
          <p className="rounded-md border border-error bg-surface px-3 py-2 text-center text-sm text-error" role="alert">
            {mutations.error}
          </p>
        ) : null}

        {showInitialLoading ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading shopping list">
            <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-surface-muted" />
          </div>
        ) : null}

        {shoppingNotFound ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-base font-semibold text-text-primary">No shopping list yet</p>
            <p className="max-w-xs text-sm text-text-secondary">
              Create this week&apos;s meal plan first — then ingredients can show up here when you generate or add
              items.
            </p>
            <Link
              href="/meal-plan"
              className="min-h-12 rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Go to meals
            </Link>
          </div>
        ) : null}

        {fatalShopping ? (
          <div className="rounded-xl border border-error bg-surface p-6 text-center shadow-sm" role="alert">
            <p className="font-semibold text-error">Something went wrong</p>
            <p className="mt-1 text-sm text-text-secondary">{error.message}</p>
          </div>
        ) : null}

        {data !== undefined && !fatalShopping ? (
          <>
            {isValidating && !showInitialLoading ? (
              <p className="text-center text-xs text-text-muted" aria-live="polite">
                Syncing…
              </p>
            ) : null}
            {view === "meal" ? (
              mealLoading && mealData === undefined ? (
                <div className="flex flex-col gap-3" aria-busy="true">
                  <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
                  <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />
                </div>
              ) : mealData !== undefined ? (
                <ShoppingMealView list={data} mealPlan={mealData} />
              ) : (
                <p className="text-center text-sm text-text-secondary">
                  {mealError !== undefined ? "Could not load meal labels for this week." : "Loading meals…"}
                </p>
              )
            ) : null}
            {view === "section" ? <ShoppingSectionView groups={data.groups} /> : null}
            {view === "checklist" ? (
              <ShoppingChecklistView
                groups={data.groups}
                onToggleChecked={(id, next) => void mutations.patchChecked(id, next)}
                onToggleAlreadyHave={(id, next) => void mutations.patchAlreadyHave(id, next)}
                onRemoveGroup={(g) => void mutations.deleteGroupByContributions(g)}
              />
            ) : null}
          </>
        ) : null}
      </main>

      {data !== undefined && !fatalShopping ? (
        <>
          <button
            type="button"
            aria-label="Add shopping item"
            disabled={mutations.busy}
            onClick={() => setSheetOpen(true)}
            className="fixed bottom-24 right-4 z-[40] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl font-light text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            +
          </button>
          <AddShoppingItemSheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onSave={(input) => void mutations.addManualItem(input)}
          />
        </>
      ) : null}
    </div>
  );
}
