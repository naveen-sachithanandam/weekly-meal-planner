import type { MealPlanMealType } from "../../lib/types";

type MealTypeRowLabelsProps = {
  mealTypes: MealPlanMealType[];
};

export function MealTypeRowLabels({ mealTypes }: MealTypeRowLabelsProps) {
  return (
    <div
      data-testid="meal-type-row-labels"
      className="flex w-20 shrink-0 flex-col gap-2"
    >
      <div className="mb-2 min-h-[4.5rem]" aria-hidden />

      {mealTypes.map((mealType) => (
        <div
          key={mealType.id}
          data-testid={`meal-type-label-${mealType.name.toLowerCase()}`}
          className="flex min-h-12 items-center pr-1 text-xs font-medium text-muted"
        >
          {mealType.name}
        </div>
      ))}
    </div>
  );
}
