import type { DayOfWeek, MealSlot, MealSlotType } from "@prisma/client";
import { useCallback, useState } from "react";

import { MealSlotBottomSheet } from "@/components/meal-plan/meal-slot-bottom-sheet";
import { eggRuleViolated, isEatOutSlot, showToddlerLunch, slotIsVisible } from "@/lib/meal-rules";
import type { DayOfWeek as RulesDayOfWeek, MealSlotType as RulesMealSlotType } from "@/types/meal";

export interface MealCellProps {
  dayOfWeek: DayOfWeek;
  slot: MealSlotType;
  /** When true, the whole day is in trip mode (slots hidden per product spec). */
  isTrip: boolean;
  /** Optional trip notes from `DayPlan` for trip-day cells. */
  tripNotes?: string | null;
  meal: MealSlot;
  /** When set, the cell opens an editor and calls this with the merged slot (trip / Friday eat-out omit). */
  onSlotSave?: (dayOfWeek: DayOfWeek, slot: MealSlotType, meal: MealSlot) => void;
}

function toRulesDay(day: DayOfWeek): RulesDayOfWeek {
  return day as RulesDayOfWeek;
}

function toRulesSlot(s: MealSlotType): RulesMealSlotType {
  return s as RulesMealSlotType;
}

/** Tag row from slot booleans (SPEC.md meal tags). */
function tagsFromMeal(meal: MealSlot): readonly { symbol: string; label: string }[] {
  const out: { symbol: string; label: string }[] = [];
  if (meal.isQuick) out.push({ symbol: "⚡", label: "Quick" });
  if (meal.isMakeAhead) out.push({ symbol: "🌙", label: "Make-ahead" });
  if (meal.isEasy) out.push({ symbol: "🟢", label: "Easy" });
  if (meal.needsTime) out.push({ symbol: "⚠️", label: "Needs time" });
  return out;
}

/**
 * One meal slot in the weekly grid: trip / eat-out / daycare lunch / weekend toddler,
 * tags, and warnings driven by `lib/meal-rules` plus `MealSlot.proteinWarning` from the API.
 */
export function MealCell({ dayOfWeek, slot, isTrip, tripNotes, meal, onSlotSave }: MealCellProps) {
  const rulesDay = toRulesDay(dayOfWeek);
  const rulesSlot = toRulesSlot(slot);
  const visible = slotIsVisible(rulesDay, rulesSlot, isTrip);

  if (!visible) {
    const note = tripNotes?.trim() ?? "";
    return (
      <div className="flex min-h-[4.5rem] flex-col justify-center rounded-md border border-border bg-surface-muted p-3 text-sm text-text-muted">
        {note !== "" ? <p className="leading-snug">{note}</p> : <p>Trip day</p>}
      </div>
    );
  }

  if (isEatOutSlot(rulesDay, rulesSlot, isTrip)) {
    return (
      <div className="flex min-h-[4.5rem] flex-col justify-center rounded-md border border-accent bg-[var(--color-bg-accent-subtle)] p-3">
        <p className="text-center text-sm font-medium text-text-primary">🍽️ Eating out</p>
      </div>
    );
  }

  const daycareLunch =
    showToddlerLunch(rulesDay, isTrip) === "daycare" && rulesSlot === "LUNCH";
  const weekendHomeLunch =
    showToddlerLunch(rulesDay, isTrip) === "home" && rulesSlot === "LUNCH";
  const eggViolation = eggRuleViolated(rulesDay, meal.mainMealText);
  const tags = tagsFromMeal(meal);
  const main = meal.mainMealText.trim();
  const editable = onSlotSave !== undefined;
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSheetSave = useCallback(
    (next: MealSlot) => {
      onSlotSave?.(dayOfWeek, slot, next);
    },
    [dayOfWeek, onSlotSave, slot],
  );

  const empty = main === "";
  const cellSurface = empty
    ? "border-dashed border-border bg-surface-muted"
    : "border-border bg-surface shadow-sm";

  return (
    <>
      <button
        type="button"
        disabled={!editable}
        onClick={() => editable && setSheetOpen(true)}
        className={`flex min-h-[4.5rem] w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors ${
          editable ? "cursor-pointer hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" : "cursor-default"
        } ${cellSurface}`}
        aria-label={editable ? `Edit ${slot} meal` : undefined}
      >
        <div className="flex min-h-[1.25rem] items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-sm font-medium leading-snug text-text-primary">
            {empty ? (
              <span className="text-text-muted" aria-hidden>
                +
              </span>
            ) : (
              main
            )}
          </div>
          {editable && !empty ? (
            <span className="shrink-0 text-[0.65rem] font-medium uppercase tracking-wide text-text-muted">Edit</span>
          ) : null}
        </div>

        {daycareLunch ? (
          <p className="text-xs font-medium text-text-secondary">🏫 Daycare</p>
        ) : null}

        {weekendHomeLunch ? (
          <div className="text-xs leading-snug text-text-secondary">
            {meal.toddlerFriendly ? (
              <p>🧒 Toddler: same as adults</p>
            ) : meal.toddlerNote !== null && meal.toddlerNote.trim() !== "" ? (
              <p>🧒 Toddler: {meal.toddlerNote.trim()}</p>
            ) : null}
          </div>
        ) : null}

        {tags.length > 0 ? (
          <p className="text-xs leading-relaxed text-text-secondary" aria-label="Meal tags">
            {tags.map((t) => (
              <span key={t.label} className="mr-1.5 whitespace-nowrap" title={t.label}>
                {t.symbol}
              </span>
            ))}
          </p>
        ) : null}

        {meal.proteinWarning ? (
          <p
            className="rounded-sm bg-[var(--color-bg-warning-subtle)] px-2 py-1 text-xs font-medium text-warning"
            role="status"
          >
            ⚠️ Protein or busy-morning check
          </p>
        ) : null}

        {eggViolation ? (
          <p className="rounded-sm border border-error px-2 py-1 text-xs font-medium text-error" role="alert">
            Eggs are not allowed on Saturday.
          </p>
        ) : null}
      </button>

      {editable ? (
        <MealSlotBottomSheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          day={dayOfWeek}
          slot={slot}
          isTrip={isTrip}
          existingSlot={meal}
          onSave={handleSheetSave}
        />
      ) : null}
    </>
  );
}
