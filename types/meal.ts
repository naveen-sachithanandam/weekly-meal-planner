/** Calendar day key aligned with Prisma `DayOfWeek` / SPEC.md week grid. */
export type DayOfWeek =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

/** Meal column aligned with Prisma `MealSlotType`. */
export type MealSlotType = "BREAKFAST" | "LUNCH" | "DINNER";
