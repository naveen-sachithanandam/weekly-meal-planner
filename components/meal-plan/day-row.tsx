import { DayOfWeek, MealSlotType, type MealSlot } from "@prisma/client";

import { MealCell } from "@/components/meal-plan/meal-cell";
import type { MealPlanDayApi } from "@/hooks/use-meal-plan";
import { isWeekend } from "@/lib/meal-rules";
import { MEAL_PLAN_DAY_LABEL, MEAL_PLAN_SLOT_LABEL, MEAL_PLAN_SLOT_ORDER } from "@/lib/meal-plan-ui-labels";
import type { DayOfWeek as RulesDayOfWeek } from "@/types/meal";

function rulesDay(day: DayOfWeek): RulesDayOfWeek {
  return day as RulesDayOfWeek;
}

/** Resolves a slot row from the API payload, using a neutral placeholder if a slot row is missing. */
function mealForSlot(day: MealPlanDayApi, slot: MealSlotType): MealSlot {
  const found = day.mealSlots.find((m) => m.slot === slot);
  if (found) return found;
  return {
    id: `missing-${day.id}-${slot}`,
    dayPlanId: day.id,
    slot,
    mainMealText: "",
    proteinWarning: false,
    isQuick: false,
    isMakeAhead: false,
    isEasy: false,
    needsTime: false,
    toddlerFriendly: false,
    toddlerNote: null,
  };
}

export interface DayRowProps {
  day: MealPlanDayApi;
  /** Persist one edited slot (full-week POST); omitted for trip rows and non-editable cells. */
  onSlotSave?: (dayOfWeek: DayOfWeek, slot: MealSlotType, meal: MealSlot) => void;
}

/**
 * One calendar day: weekday label, optional 🟢 Easy day (Sat/Sun), and three `MealCell` columns.
 */
export function DayRow({ day, onSlotSave }: DayRowProps) {
  const dow = day.dayOfWeek;
  const weekendSoft = isWeekend(rulesDay(dow)) && !day.isTrip;
  const tripMuted = day.isTrip;

  return (
    <section
      className={`rounded-xl border p-3 shadow-sm ${
        tripMuted
          ? "border-border bg-surface-muted text-text-secondary"
          : weekendSoft
            ? "border-border bg-[var(--color-bg-positive-subtle)]"
            : "border-border bg-surface"
      }`}
      aria-label={`Meals for ${MEAL_PLAN_DAY_LABEL[dow]}`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-text-primary">{MEAL_PLAN_DAY_LABEL[dow]}</h3>
        {weekendSoft ? (
          <span className="text-xs font-medium text-text-secondary" aria-label="Weekend easy day">
            🟢 Easy day
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MEAL_PLAN_SLOT_ORDER.map((slot) => (
          <div key={slot} className="flex min-w-0 flex-col gap-1">
            <span className="text-center text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
              {MEAL_PLAN_SLOT_LABEL[slot]}
            </span>
            <MealCell
              dayOfWeek={dow}
              slot={slot}
              isTrip={day.isTrip}
              tripNotes={day.tripNotes}
              meal={mealForSlot(day, slot)}
              onSlotSave={onSlotSave}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
