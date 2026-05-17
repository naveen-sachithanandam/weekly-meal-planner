export function IngredientLoading() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 text-xs text-[var(--badge-pending-text)]"
    >
      <span
        aria-hidden
        className="inline-block size-3 animate-spin rounded-full border-2 border-[var(--badge-pending-bg)] border-t-[var(--badge-pending-text)]"
      />
      <span>Generating ingredients…</span>
    </div>
  );
}
