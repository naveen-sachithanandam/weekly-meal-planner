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
      {/* Spacer matches DayHeader block height in day columns */}
      <div className="mb-2 border-b border-transparent pb-2" aria-hidden>
        <div className="flex flex-col gap-1">
          <p className="invisible text-sm font-semibold" aria-hidden>
            &nbsp;
          </p>
          <p className="invisible text-xs" aria-hidden>
            &nbsp;
          </p>
        </div>
        <div className="mt-2 invisible text-xs" aria-hidden>
          &nbsp;
        </div>
      </div>

      {mealTypes.map((mealType) => (
        <div
          key={mealType.id}
          data-testid={`meal-type-label-${mealType.name.toLowerCase()}`}
          className="flex min-h-12 items-center pr-1 text-xs font-medium text-gray-700"
        >
          {mealType.name}
        </div>
      ))}
    </div>
  );
}
