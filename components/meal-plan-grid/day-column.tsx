import type { MealPlanDay } from "../../lib/types";

type DayColumnProps = {
  day: MealPlanDay;
};

export function DayColumn({ day }: DayColumnProps) {
  return (
    <div data-testid="day-column" className="min-w-0 flex-1">
      <p className="text-sm font-medium">{day.date}</p>
    </div>
  );
}
