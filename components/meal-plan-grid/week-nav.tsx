import { addDays, format, isValid, parse } from "date-fns";

type WeekNavProps = {
  weekStart: string;
  weekOffset: number;
  onPreviousWeek: () => void;
  onCurrentWeek: () => void;
  onNextWeek: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
};

export function formatWeekRange(weekStart: string): string {
  if (!weekStart) {
    return "";
  }

  const start = parse(weekStart, "yyyy-MM-dd", new Date());
  if (!isValid(start)) {
    return "";
  }

  const end = addDays(start, 6);
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function WeekNav({
  weekStart,
  weekOffset,
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek,
  canGoPrev,
  canGoNext,
}: WeekNavProps) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-label="Previous week"
        onClick={onPreviousWeek}
        disabled={!canGoPrev}
        className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous week
      </button>
      <button
        type="button"
        aria-label="Current week"
        onClick={onCurrentWeek}
        className="rounded border px-3 py-1"
      >
        Current week
      </button>
      <button
        type="button"
        aria-label="Next week"
        onClick={onNextWeek}
        disabled={!canGoNext}
        className="rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next week
      </button>
      <p className="text-sm text-gray-700">
        {formatWeekRange(weekStart) || "Loading week…"}
      </p>
    </nav>
  );
}
