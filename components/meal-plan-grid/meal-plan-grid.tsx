"use client";

import { useState } from "react";
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
  const swrKey = `/api/meal-plan?offset=${weekOffset}`;

  const { data, error, isLoading, mutate } = useSWR(swrKey, fetchMealPlan, {
    refreshInterval: (latestData) => getRefreshInterval(latestData?.days),
  });

  const canGoPrev = weekOffset > -1;
  const canGoNext = weekOffset < 1;

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

      {isLoading && <p>Loading meal plan…</p>}
      {error && <p role="alert">Could not load meal plan.</p>}

      {data && (
        <div className="flex gap-2">
          <MealTypeRowLabels mealTypes={data.mealTypes} />
          <div className="flex min-w-0 flex-1 gap-2">
            {data.days.map((day) => (
              <DayColumn
                key={day.date}
                day={day}
                mealTypes={data.mealTypes}
                onMutate={() => mutate()}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
