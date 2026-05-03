/**
 * Single entry for domain enums and meal rule helpers—prefer `import { … } from "@/types/domain"`.
 * (`lib/meal-rules` still imports `DayOfWeek` / `MealSlotType` from `./meal` only to avoid a circular graph.)
 */
export { type DayOfWeek, type MealSlotType } from "@/types/meal";
export * from "@/lib/meal-rules";
