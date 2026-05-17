import type { MealPlanDay, MealPlanMealType } from "../../lib/types";
import { DayHeader } from "./day-header";
import { MealSlotCell } from "./meal-slot-cell/meal-slot-cell";

type DayColumnProps = {
  day: MealPlanDay;
  mealTypes: MealPlanMealType[];
  onMutate: () => void | Promise<unknown>;
};

export function DayColumn({ day, mealTypes, onMutate }: DayColumnProps) {
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
      />

      {mealTypes.map((mealType) => {
        const slot =
          day.slots.find((entry) => entry.mealTypeConfigId === mealType.id) ?? null;
        return (
          <MealSlotCell
            key={mealType.id}
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
