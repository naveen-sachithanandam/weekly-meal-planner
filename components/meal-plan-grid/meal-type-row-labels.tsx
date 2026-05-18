import type { MealPlanMealType } from "../../lib/types";

type MealTypeRowLabelsProps = {
  mealTypes: MealPlanMealType[];
};

export function MealTypeRowLabels({ mealTypes }: MealTypeRowLabelsProps) {
  return (
    <div
      data-testid="meal-type-row-labels"
      className="sticky left-0 z-10 flex w-[4.5rem] shrink-0 flex-col gap-2 bg-[var(--color-base)] pr-1 shadow-[4px_0_8px_-4px_rgba(61,44,30,0.12)] sm:static sm:w-20 sm:bg-transparent sm:shadow-none"
    >
      <div className="mb-2 min-h-[4.75rem] sm:min-h-[4.5rem]" aria-hidden />

      {mealTypes.map((mealType) => (
        <div
          key={mealType.id}
          data-testid={`meal-type-label-${mealType.name.toLowerCase()}`}
          className="flex min-h-12 items-center pr-0.5 text-[0.65rem] font-medium leading-tight text-muted sm:pr-1 sm:text-xs"
        >
          {mealType.name}
        </div>
      ))}
    </div>
  );
}
