"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { getRefreshInterval } from "../../lib/meal-plan-refresh";
import type { MealPlanResponse } from "../../lib/types";
import { DayColumn } from "./day-column";
import { MealTypeRowLabels } from "./meal-type-row-labels";
import { WeekNav } from "./week-nav";

async function fetchMealPlan(url: string): Promise<MealPlanResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load meal plan");
  }
  return response.json() as Promise<MealPlanResponse>;
}

export function MealPlanGrid() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const swrKey = `/api/meal-plan?offset=${weekOffset}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchMealPlan, {
    refreshInterval: (latestData) => getRefreshInterval(latestData?.days),
  });

  useEffect(() => {
    setExpandedSlotId(null);
  }, [weekOffset]);

  const canGoPrev = weekOffset > -1;
  const canGoNext = weekOffset < 1;

  function handleToggleExpand(slotId: string) {
    setExpandedSlotId((current) => (current === slotId ? null : slotId));
  }

  return (
    <section>
      <WeekNav
        weekStart={data?.weekStart ?? ""}
        onPreviousWeek={() => setWeekOffset((offset) => Math.max(-1, offset - 1))}
        onCurrentWeek={() => setWeekOffset(0)}
        onNextWeek={() => setWeekOffset((offset) => Math.min(1, offset + 1))}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />

      {isLoading && <p className="text-sm text-muted">Loading meal plan…</p>}
      {error && (
        <p className="text-sm text-[var(--badge-warn-text)]" role="alert">
          Could not load meal plan.
        </p>
      )}

      {data && (
        <>
          <p className="meal-plan-scroll-hint" aria-hidden="true">
            Swipe sideways to see all days
          </p>
          <div className="meal-plan-scroll" data-testid="meal-plan-scroll">
            <div className="flex w-max min-w-full gap-2 sm:w-auto">
              <MealTypeRowLabels mealTypes={data.mealTypes} />
              <div className="flex gap-2">
                {data.days.map((day) => (
                  <DayColumn
                    key={day.date}
                    day={day}
                    mealTypes={data.mealTypes}
                    expandedSlotId={expandedSlotId}
                    onToggleExpand={handleToggleExpand}
                    onMutate={() => mutate()}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
