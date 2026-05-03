import { MealSlotType, type MealSlot } from "@prisma/client";

import type { MealPlanApiPayload, MealPlanDayApi } from "@/hooks/use-meal-plan";
import { MEAL_PLAN_DAY_ORDER, MEAL_PLAN_SLOT_ORDER } from "@/lib/meal-plan-ui-labels";

function emptyMealSlot(dayPlanId: string, slot: MealSlotType): MealSlot {
  return {
    id: `${dayPlanId}-${slot}-bootstrap`,
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

/**
 * Builds a client-only full-week snapshot (Sun→Sat, three slots each) so `POST /api/meal-plan`
 * can create the `WeeklyPlan` row when GET previously returned 404.
 */
export function buildBootstrapEmptyMealPlan(weekStartSundayYmd: string): MealPlanApiPayload {
  const now = new Date().toISOString();
  const weeklyPlanId = "bootstrap";
  const days: MealPlanDayApi[] = MEAL_PLAN_DAY_ORDER.map((dow) => {
    const dayId = `bootstrap-${weekStartSundayYmd}-${dow}`;
    return {
      id: dayId,
      weeklyPlanId,
      dayOfWeek: dow,
      isTrip: false,
      tripNotes: null,
      mealSlots: MEAL_PLAN_SLOT_ORDER.map((slot) => emptyMealSlot(dayId, slot)),
    };
  });
  return {
    id: weeklyPlanId,
    weekStartSunday: weekStartSundayYmd,
    createdAt: now,
    updatedAt: now,
    days,
  };
}
