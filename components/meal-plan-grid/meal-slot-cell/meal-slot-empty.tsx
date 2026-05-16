type MealSlotEmptyProps = {
  onStartEditing: () => void;
};

export function MealSlotEmpty({ onStartEditing }: MealSlotEmptyProps) {
  return (
    <button
      type="button"
      onClick={onStartEditing}
      className="w-full rounded border border-dashed border-gray-300 px-2 py-2 text-left text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
    >
      + Add meal
    </button>
  );
}
