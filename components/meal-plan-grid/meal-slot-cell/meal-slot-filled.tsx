type MealSlotFilledProps = {
  mealName: string;
  onStartEditing: () => void;
};

export function MealSlotFilled({ mealName, onStartEditing }: MealSlotFilledProps) {
  return (
    <button
      type="button"
      onClick={onStartEditing}
      className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-left text-xs font-medium text-gray-900 hover:border-gray-300"
    >
      {mealName}
    </button>
  );
}
