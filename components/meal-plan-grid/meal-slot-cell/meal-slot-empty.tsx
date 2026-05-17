type MealSlotEmptyProps = {
  onStartEditing: () => void;
};

export function MealSlotEmpty({ onStartEditing }: MealSlotEmptyProps) {
  return (
    <button
      type="button"
      onClick={onStartEditing}
      className="surface-card w-full border-dashed px-2 py-2 text-left text-xs text-muted hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
    >
      + Add meal
    </button>
  );
}
