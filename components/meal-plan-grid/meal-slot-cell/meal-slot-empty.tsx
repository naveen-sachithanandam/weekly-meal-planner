type MealSlotEmptyProps = {
  onStartEditing: () => void;
};

export function MealSlotEmpty({ onStartEditing }: MealSlotEmptyProps) {
  return (
    <button
      type="button"
      onClick={onStartEditing}
      className="surface-card w-full min-h-12 border-dashed px-2 py-3 text-left text-xs text-muted hover:border-[var(--color-accent)] hover:text-[var(--color-text)] sm:py-2"
    >
      + Add meal
    </button>
  );
}
