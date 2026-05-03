import { DayOfWeek, MealSlotType } from "@prisma/client";

/** Toronto week row order (Sunday → Saturday). */
export const MEAL_PLAN_DAY_ORDER: readonly DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

/** Human-readable weekday title for headers and sheets. */
export const MEAL_PLAN_DAY_LABEL: Record<DayOfWeek, string> = {
  [DayOfWeek.SUNDAY]: "Sunday",
  [DayOfWeek.MONDAY]: "Monday",
  [DayOfWeek.TUESDAY]: "Tuesday",
  [DayOfWeek.WEDNESDAY]: "Wednesday",
  [DayOfWeek.THURSDAY]: "Thursday",
  [DayOfWeek.FRIDAY]: "Friday",
  [DayOfWeek.SATURDAY]: "Saturday",
};

/** Short column titles for the three meal slots. */
export const MEAL_PLAN_SLOT_LABEL: Record<MealSlotType, string> = {
  [MealSlotType.BREAKFAST]: "Breakfast",
  [MealSlotType.LUNCH]: "Lunch",
  [MealSlotType.DINNER]: "Dinner",
};

/** Column order for breakfast → lunch → dinner. */
export const MEAL_PLAN_SLOT_ORDER: readonly MealSlotType[] = [
  MealSlotType.BREAKFAST,
  MealSlotType.LUNCH,
  MealSlotType.DINNER,
];
