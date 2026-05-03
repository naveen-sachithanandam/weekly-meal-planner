"use client";

import { DayOfWeek, MealSlotType, type MealSlot } from "@prisma/client";
import { useCallback, useMemo, useState } from "react";
import { useSWRConfig } from "swr";

import { DayRow } from "@/components/meal-plan/day-row";
import { WeekNav } from "@/components/meal-plan/week-nav";
import {
  getMealPlanUrl,
  isMealPlanNotFoundError,
  useMealPlan,
  type MealPlanApiPayload,
  type MealPlanDayApi,
} from "@/hooks/use-meal-plan";
import { useMealPlanMutation } from "@/hooks/use-meal-plan-mutation";
import { buildBootstrapEmptyMealPlan } from "@/lib/meal-plan-bootstrap";
import { MEAL_PLAN_DAY_ORDER } from "@/lib/meal-plan-ui-labels";
import { formatWeekStartDateParam, getCurrentWeekStart } from "@/lib/week-boundary";

function placeholderMeal(dayPlanId: string, slot: MealSlotType): MealSlot {
  return {
    id: `${dayPlanId}-${slot}-placeholder`,
    dayPlanId,
    slot,
    mainMealText: "",
    proteinWarning: false,
    isQuick: false,
    isMakeAhead: false,
    isEasy: false,
    needsTime: false,
    toddlerFriendly: false,
    toddlerNote: null,
  };
}

/** Fills missing calendar days so the grid always shows seven rows for a loaded plan. */
function daysSunThroughSat(plan: MealPlanApiPayload): MealPlanDayApi[] {
  const byDow = new Map(plan.days.map((d) => [d.dayOfWeek, d]));
  return MEAL_PLAN_DAY_ORDER.map((dow) => {
    const existing = byDow.get(dow);
    if (existing) return existing;
    const id = `${plan.id}-virtual-${dow}`;
    return {
      id,
      weeklyPlanId: plan.id,
      dayOfWeek: dow,
      isTrip: false,
      tripNotes: null,
      mealSlots: [
        placeholderMeal(id, MealSlotType.BREAKFAST),
        placeholderMeal(id, MealSlotType.LUNCH),
        placeholderMeal(id, MealSlotType.DINNER),
      ],
    };
  });
}

/** Merges one edited slot into a full seven-day snapshot for POST (SPEC.md full-week save). */
function mergeSlotIntoPlan(
  plan: MealPlanApiPayload,
  dayOfWeek: DayOfWeek,
  slot: MealSlotType,
  meal: MealSlot,
): MealPlanApiPayload {
  const fullDays = daysSunThroughSat(plan);
  const nextDays = fullDays.map((d) => {
    if (d.dayOfWeek !== dayOfWeek) return d;
    const prev = d.mealSlots.find((m) => m.slot === slot);
    const merged: MealSlot = {
      ...meal,
      id: prev?.id ?? meal.id,
      dayPlanId: d.id,
      slot,
    };
    const nextSlots = d.mealSlots.map((m) => (m.slot === slot ? merged : m));
    return { ...d, mealSlots: nextSlots };
  });
  return { ...plan, days: nextDays };
}

/** Weekly meal grid: week navigation, seven day rows, and loading / empty / error states. */
export default function MealPlanPage() {
  const [weekStart, setWeekStart] = useState(() => formatWeekStartDateParam(getCurrentWeekStart()));
  const { data, error, isLoading, isValidating } = useMealPlan(weekStart);
  const { mutate } = useSWRConfig();
  const { save, isSaving, error: saveError } = useMealPlanMutation(weekStart);

  const rows = useMemo(() => (data ? daysSunThroughSat(data) : []), [data]);

  const handleSlotSave = useCallback(
    (dayOfWeek: DayOfWeek, slot: MealSlotType, meal: MealSlot) => {
      if (data === undefined) return;
      const url = getMealPlanUrl(weekStart);
      const previous = data;
      const next = mergeSlotIntoPlan(previous, dayOfWeek, slot, meal);
      void (async () => {
        await mutate(url, next, { revalidate: false });
        const ok = await save(next);
        if (!ok) await mutate(url, previous, { revalidate: true });
      })();
    },
    [data, weekStart, mutate, save],
  );

  const handleStartWeek = useCallback(() => {
    const url = getMealPlanUrl(weekStart);
    const bootstrap = buildBootstrapEmptyMealPlan(weekStart);
    void (async () => {
      await mutate(url, bootstrap, { revalidate: false });
      const ok = await save(bootstrap);
      if (!ok) await mutate(url, undefined, { revalidate: true });
    })();
  }, [weekStart, mutate, save]);

  const showInitialLoading = isLoading && data === undefined && error === undefined;
  /** 404 only while we have no cached plan (avoids empty-state + grid if SWR keeps a stale error after optimistic create). */
  const notFound =
    data === undefined && error !== undefined && isMealPlanNotFoundError(error);
  const fatalError = error !== undefined && !notFound;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WeekNav weekStart={weekStart} onWeekChange={setWeekStart} />

      <div className="border-b border-border bg-surface px-4 pb-3 pt-1">
        <h1 className="text-lg font-semibold text-text-primary">Meal plan</h1>
        <p className="text-xs text-text-secondary">Tap any slot below to add or change a meal.</p>
      </div>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-3">
        {showInitialLoading ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary shadow-sm"
            role="status"
            aria-live="polite"
          >
            <p className="font-medium text-text-primary">Loading this week…</p>
            {isValidating ? <p className="text-xs text-text-muted">Refreshing</p> : null}
          </div>
        ) : null}

        {notFound ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-surface p-8 text-center shadow-sm"
            role="status"
          >
            <div className="flex flex-col gap-2">
              <p className="text-base font-semibold text-text-primary">No plan for this week yet</p>
              <p className="max-w-xs text-sm text-text-secondary">
                Create an empty week, then tap any cell to fill in breakfast, lunch, and dinner.
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleStartWeek}
              className="min-h-12 w-full max-w-xs rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Creating…" : "Start planning this week"}
            </button>
          </div>
        ) : null}

        {fatalError ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-error bg-surface p-8 text-center shadow-sm"
            role="alert"
          >
            <p className="text-base font-semibold text-error">Something went wrong</p>
            <p className="max-w-xs text-sm text-text-secondary">{error.message}</p>
          </div>
        ) : null}

        {data !== undefined && !fatalError ? (
          <>
            {saveError !== null ? (
              <p className="rounded-md border border-error bg-surface px-3 py-2 text-center text-sm text-error" role="alert">
                {saveError}
              </p>
            ) : null}
            {isSaving ? (
              <p className="text-center text-xs text-text-muted" aria-live="polite">
                Saving…
              </p>
            ) : null}
            {isValidating && !showInitialLoading ? (
              <p className="text-center text-xs text-text-muted" aria-live="polite">
                Updating…
              </p>
            ) : null}
            <div className="flex flex-col gap-4">
              {rows.map((day) => (
                <DayRow key={`${day.id}-${day.dayOfWeek}`} day={day} onSlotSave={handleSlotSave} />
              ))}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
