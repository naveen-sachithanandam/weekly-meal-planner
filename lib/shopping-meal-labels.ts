import type { MealPlanApiPayload } from "@/hooks/use-meal-plan";
import { MEAL_PLAN_DAY_LABEL, MEAL_PLAN_DAY_ORDER, MEAL_PLAN_SLOT_LABEL, MEAL_PLAN_SLOT_ORDER } from "@/lib/meal-plan-ui-labels";

const MANUAL_MEAL_KEY = "__manual__" as const;

export { MANUAL_MEAL_KEY };

/** Map each `MealSlot.id` to a single-line label for “by meal” shopping (day · slot · dish). */
export function mealSlotLabelMap(plan: MealPlanApiPayload): Map<string, string> {
  const byDow = new Map(plan.days.map((d) => [d.dayOfWeek, d]));
  const map = new Map<string, string>();
  for (const dow of MEAL_PLAN_DAY_ORDER) {
    const day = byDow.get(dow);
    if (!day) continue;
    for (const slot of MEAL_PLAN_SLOT_ORDER) {
      const meal = day.mealSlots.find((m) => m.slot === slot);
      if (!meal) continue;
      const dayName = MEAL_PLAN_DAY_LABEL[dow];
      const slotName = MEAL_PLAN_SLOT_LABEL[slot];
      const title = meal.mainMealText.trim() !== "" ? meal.mainMealText.trim() : "—";
      map.set(meal.id, `${dayName} · ${slotName}: ${title}`);
    }
  }
  return map;
}

/** Meal slot ids in calendar order (for stable “by meal” section ordering). */
export function orderedMealSlotIdsFromPlan(plan: MealPlanApiPayload): string[] {
  const byDow = new Map(plan.days.map((d) => [d.dayOfWeek, d]));
  const ids: string[] = [];
  for (const dow of MEAL_PLAN_DAY_ORDER) {
    const day = byDow.get(dow);
    if (!day) continue;
    for (const slot of MEAL_PLAN_SLOT_ORDER) {
      const meal = day.mealSlots.find((m) => m.slot === slot);
      if (meal) ids.push(meal.id);
    }
  }
  return ids;
}
