"use client";

import { format, parse } from "date-fns";

type ToddlerOverrideConflict = {
  slotId: string;
  mealType: string;
  mealName: string;
};

type ToddlerOverrideResponse = {
  override: { date: string; isHome: boolean };
  conflicts: ToddlerOverrideConflict[];
};

type DayHeaderProps = {
  date: string;
  isToddlerHome: boolean;
  isPast: boolean;
  onMutate: () => void | Promise<unknown>;
};

function formatDayHeader(date: string): { dayName: string; dateLabel: string } {
  const parsed = parse(date, "yyyy-MM-dd", new Date());
  return {
    dayName: format(parsed, "EEEE"),
    dateLabel: format(parsed, "MMM d"),
  };
}

function buildConflictMessage(conflicts: ToddlerOverrideConflict[]): string {
  const lines = conflicts.map(
    (conflict) => `${conflict.mealType}: ${conflict.mealName}`,
  );
  return `Some meals may not be toddler-appropriate:\n${lines.join("\n")}\n\nSave anyway?`;
}

async function postToddlerOverride(
  date: string,
  isHome: boolean,
  force = false,
): Promise<ToddlerOverrideResponse> {
  const response = await fetch("/api/toddler-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, isHome, ...(force ? { force: true } : {}) }),
  });

  if (!response.ok) {
    throw new Error("Failed to save toddler override");
  }

  return response.json() as Promise<ToddlerOverrideResponse>;
}

export function DayHeader({ date, isToddlerHome, isPast, onMutate }: DayHeaderProps) {
  const { dayName, dateLabel } = formatDayHeader(date);

  async function handleToggle() {
    const nextIsHome = !isToddlerHome;

    try {
      const result = await postToddlerOverride(date, nextIsHome);

      if (result.conflicts.length > 0) {
        const confirmed = window.confirm(buildConflictMessage(result.conflicts));
        if (!confirmed) {
          return;
        }
        await postToddlerOverride(date, nextIsHome, true);
      }

      await onMutate();
    } catch {
      window.alert("Could not update toddler schedule. Please try again.");
    }
  }

  return (
    <header
      data-testid="day-header"
      className="surface-card mb-2 px-2 py-2"
    >
      <div className="flex flex-col gap-0.5 text-center">
        <p className="text-sm font-semibold">{dayName}</p>
        <p className="text-xs text-muted">{dateLabel}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {isToddlerHome && (
          <span
            data-testid="toddler-indicator"
            className="toddler-chip rounded px-1.5 py-0.5 text-xs font-medium"
          >
            Toddler home
          </span>
        )}

        {!isPast && (
          <button
            type="button"
            aria-label={isToddlerHome ? "Mark toddler away" : "Mark toddler home"}
            onClick={() => void handleToggle()}
            className="btn-neutral px-2 py-0.5 text-xs"
          >
            {isToddlerHome ? "Toddler away" : "Toddler home"}
          </button>
        )}
      </div>
    </header>
  );
}
