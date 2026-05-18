import { addDays, format, isValid, parse } from "date-fns";

type WeekNavProps = {
  weekStart: string;
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
  onPreviousWeek,
  onCurrentWeek,
  onNextWeek,
  canGoPrev,
  canGoNext,
}: WeekNavProps) {
  const rangeLabel = formatWeekRange(weekStart) || "Loading week…";

  return (
    <nav className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full items-center justify-between gap-2 text-sm sm:w-auto sm:justify-start">
        <button
          type="button"
          aria-label="Previous week"
          onClick={onPreviousWeek}
          disabled={!canGoPrev}
          className="btn-neutral btn-touch px-3 py-2 text-lg leading-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-medium sm:min-w-[10rem] sm:text-base">
          {rangeLabel}
        </span>
        <button
          type="button"
          aria-label="Next week"
          onClick={onNextWeek}
          disabled={!canGoNext}
          className="btn-neutral btn-touch px-3 py-2 text-lg leading-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>
      <button
        type="button"
        aria-label="This week"
        onClick={onCurrentWeek}
        className="btn-accent w-full px-3 py-2.5 text-sm sm:w-auto sm:py-1"
      >
        This week
      </button>
    </nav>
  );
}
