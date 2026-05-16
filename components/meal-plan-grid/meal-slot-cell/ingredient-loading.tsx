export function IngredientLoading() {
  return (
    <div
      role="status"
      className="mt-2 flex items-center gap-2 text-xs text-gray-600"
    >
      <span
        aria-hidden
        className="inline-block size-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"
      />
      <span>Generating ingredients…</span>
    </div>
  );
}
