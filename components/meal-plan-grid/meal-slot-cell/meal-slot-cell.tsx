import type { MealPlanSlot } from "../../../lib/types";

type MealSlotCellProps = {
  slot: MealPlanSlot | null;
  mealType: string;
  date: string;
  isPast: boolean;
};

export function MealSlotCell({ slot, mealType, date, isPast }: MealSlotCellProps) {
  return (
    <div
      data-testid={`meal-slot-${mealType.toLowerCase()}`}
      data-date={date}
      data-past={isPast}
      className="min-h-12 rounded border border-dashed border-gray-200 p-2 text-xs text-gray-400"
    >
      {slot?.mealName ?? "—"}
    </div>
  );
}
