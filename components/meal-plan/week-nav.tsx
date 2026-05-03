"use client";

import {
  formatWeekLabel,
  parseWeekStartDateString,
  shiftTorontoSundayByDays,
} from "@/lib/week-boundary";

export interface WeekNavProps {
  /** Toronto Sunday week key (`YYYY-MM-DD`). */
  weekStart: string;
  /** Called with the adjacent week’s Sunday key when prev/next is used. */
  onWeekChange: (nextWeekStart: string) => void;
}

/**
 * Week title (Toronto calendar) plus previous / next week controls.
 * Colours use Tailwind tokens mapped to `design-tokens.css`.
 */
export function WeekNav({ weekStart, onWeekChange }: WeekNavProps) {
  const parsed = parseWeekStartDateString(weekStart);
  const label = parsed !== null ? formatWeekLabel(parsed) : "Week";

  const prevKey = shiftTorontoSundayByDays(weekStart, -7);
  const nextKey = shiftTorontoSundayByDays(weekStart, 7);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-brand transition-colors hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-40"
        aria-label="Previous week"
        disabled={prevKey === null}
        onClick={() => {
          if (prevKey !== null) onWeekChange(prevKey);
        }}
      >
        <span aria-hidden className="text-xl leading-none">
          ←
        </span>
      </button>
      <h2 className="min-w-0 flex-1 truncate text-center text-lg font-medium text-text-primary">
        {label}
      </h2>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-brand transition-colors hover:bg-brand-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-40"
        aria-label="Next week"
        disabled={nextKey === null}
        onClick={() => {
          if (nextKey !== null) onWeekChange(nextKey);
        }}
      >
        <span aria-hidden className="text-xl leading-none">
          →
        </span>
      </button>
    </header>
  );
}
