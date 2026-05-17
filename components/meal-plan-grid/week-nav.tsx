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
    <nav className="mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          aria-label="Previous week"
          onClick={onPreviousWeek}
          disabled={!canGoPrev}
          className="btn-neutral px-2 py-1 text-lg leading-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹
        </button>
        <span className="min-w-[10rem] text-center font-medium">{rangeLabel}</span>
        <button
          type="button"
          aria-label="Next week"
          onClick={onNextWeek}
          disabled={!canGoNext}
          className="btn-neutral px-2 py-1 text-lg leading-none disabled:cursor-not-allowed disabled:opacity-40"
        >
          ›
        </button>
      </div>
      <button
        type="button"
        aria-label="This week"
        onClick={onCurrentWeek}
        className="btn-accent px-3 py-1 text-sm"
      >
        This week
      </button>
    </nav>
  );
}
