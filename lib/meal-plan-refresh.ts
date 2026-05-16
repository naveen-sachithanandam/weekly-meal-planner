import type { MealPlanDay } from "./types";

export function getRefreshInterval(days: MealPlanDay[] | undefined): number {
  if (!days?.length) {
    return 0;
  }

  const hasPending = days.some((day) =>
    day.slots.some((slot) => slot.ingredientsStatus === "PENDING"),
  );

  return hasPending ? 3000 : 0;
}
