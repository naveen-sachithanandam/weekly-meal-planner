import type { MealPlanDay, MealPlanMealType } from "../../lib/types";
import { DayHeader } from "./day-header";
import { MealSlotCell } from "./meal-slot-cell/meal-slot-cell";

type DayColumnProps = {
  day: MealPlanDay;
  mealTypes: MealPlanMealType[];
  expandedSlotId: string | null;
  onToggleExpand: (slotId: string) => void;
  onMutate: () => void | Promise<unknown>;
};

export function DayColumn({
  day,
  mealTypes,
  expandedSlotId,
  onToggleExpand,
  onMutate,
}: DayColumnProps) {
  return (
    <div
      data-testid="day-column"
      data-past={day.isPast}
      className={`flex w-[9.25rem] shrink-0 flex-col gap-2 sm:w-auto sm:min-w-0 sm:flex-1 ${
        day.isPast ? "day-column-past" : ""
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
            isExpanded={slot !== null && expandedSlotId === slot.id}
            onToggleExpand={onToggleExpand}
            onMutate={onMutate}
          />
        );
      })}
    </div>
  );
}
