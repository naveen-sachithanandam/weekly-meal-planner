import type { IngredientsStatus } from "../../../lib/types";

type StatusBadgeProps = {
  ingredientsStatus: IngredientsStatus;
  ingredientCount: number;
};

export function StatusBadge({
  ingredientsStatus,
  ingredientCount,
}: StatusBadgeProps) {
  if (ingredientsStatus === "READY") {
    return (
      <span
        className="badge-ready inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
        aria-label={`${ingredientCount} ingredients`}
      >
        ●{ingredientCount}
      </span>
    );
  }

  if (ingredientsStatus === "PENDING") {
    return (
      <span
        className="badge-pending inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
        aria-label="Generating ingredients"
      >
        <span
          aria-hidden
          className="inline-block size-2.5 animate-spin rounded-full border border-[var(--badge-pending-text)] border-t-transparent"
        />
        ⟳
      </span>
    );
  }

  return (
    <span
      className="badge-warn inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
      aria-label="Ingredients unavailable"
    >
      ⚠
    </span>
  );
}
