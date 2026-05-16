import type { MealPlanDay, WeekNavigationProps } from "../../lib/types";
import { DayHeader } from "./day-header";
import { MealSlotCell } from "./meal-slot-cell/meal-slot-cell";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER"] as const;

type DayColumnProps = {
  day: MealPlanDay;
  onMutate: () => void | Promise<unknown>;
} & WeekNavigationProps;

export function DayColumn({
  day,
  onMutate,
  onPrevWeek,
  onNextWeek,
  canGoPrev,
  canGoNext,
}: DayColumnProps) {
  return (
    <div
      data-testid="day-column"
      data-past={day.isPast}
      className={`min-w-0 flex-1 flex flex-col gap-2 ${
        day.isPast ? "opacity-50" : ""
      }`}
    >
      <DayHeader
        date={day.date}
        isToddlerHome={day.isToddlerHome}
        isPast={day.isPast}
        onMutate={onMutate}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />

      {MEAL_TYPES.map((mealType) => {
        const slot = day.slots.find((entry) => entry.mealType === mealType) ?? null;
        return (
          <MealSlotCell
            key={mealType}
            slot={slot}
            mealType={mealType}
            date={day.date}
            isPast={day.isPast}
            onMutate={onMutate}
          />
        );
      })}
    </div>
  );
}
