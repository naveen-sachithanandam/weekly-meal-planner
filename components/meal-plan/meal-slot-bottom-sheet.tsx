"use client";

import { MealSlotType, type DayOfWeek, type MealSlot } from "@prisma/client";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { FavouriteMealChips } from "@/components/meal-plan/favourite-meal-chips";
import { eggRuleViolated, showToddlerLunch } from "@/lib/meal-rules";
import { MEAL_PLAN_DAY_LABEL, MEAL_PLAN_SLOT_LABEL } from "@/lib/meal-plan-ui-labels";
import type { DayOfWeek as RulesDayOfWeek, MealSlotType as RulesMealSlotType } from "@/types/meal";

export interface MealSlotBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayOfWeek;
  slot: MealSlotType;
  /** Trip flag for this calendar day (hides toddler lunch field when not home). */
  isTrip: boolean;
  existingSlot?: MealSlot;
  onSave: (slot: MealSlot) => void;
}

function toRulesDay(d: DayOfWeek): RulesDayOfWeek {
  return d as RulesDayOfWeek;
}

function toRulesSlot(s: MealSlotType): RulesMealSlotType {
  return s as RulesMealSlotType;
}

function buildMealFromForm(
  base: MealSlot | undefined,
  day: DayOfWeek,
  slot: MealSlotType,
  mainMealText: string,
  isQuick: boolean,
  isMakeAhead: boolean,
  isEasy: boolean,
  needsTime: boolean,
  /** When false, toddler fields are taken from `base` unchanged (weekday daycare lunch, etc.). */
  includeToddlerFields: boolean,
  toddlerFriendly: boolean,
  toddlerNote: string | null,
): MealSlot {
  const resolved: MealSlot = {
    id: base?.id ?? `draft-${day}-${slot}`,
    dayPlanId: base?.dayPlanId ?? `draft-day-${day}`,
    slot,
    mainMealText,
    proteinWarning: base?.proteinWarning ?? false,
    isQuick,
    isMakeAhead,
    isEasy,
    needsTime,
    toddlerFriendly: includeToddlerFields ? toddlerFriendly : (base?.toddlerFriendly ?? false),
    toddlerNote: includeToddlerFields ? toddlerNote : (base?.toddlerNote ?? null),
  };
  return resolved;
}

/**
 * Bottom sheet editor for one meal slot (favourites, text, tags, toddler note, save).
 */
export function MealSlotBottomSheet({
  isOpen,
  onClose,
  day,
  slot,
  isTrip,
  existingSlot,
  onSave,
}: MealSlotBottomSheetProps) {
  const titleId = useId();
  const rulesDay = toRulesDay(day);
  const rulesSlot = toRulesSlot(slot);

  const [mainMealText, setMainMealText] = useState("");
  const [isQuick, setIsQuick] = useState(false);
  const [isMakeAhead, setIsMakeAhead] = useState(false);
  const [isEasy, setIsEasy] = useState(false);
  const [needsTime, setNeedsTime] = useState(false);
  const [toddlerFriendly, setToddlerFriendly] = useState(false);
  const [toddlerNote, setToddlerNote] = useState("");
  const [selectedFavouriteId, setSelectedFavouriteId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    const base = existingSlot;
    setMainMealText(base?.mainMealText ?? "");
    setIsQuick(base?.isQuick ?? false);
    setIsMakeAhead(base?.isMakeAhead ?? false);
    setIsEasy(base?.isEasy ?? false);
    setNeedsTime(base?.needsTime ?? false);
    setToddlerFriendly(base?.toddlerFriendly ?? false);
    setToddlerNote(base?.toddlerNote ?? "");
    setSelectedFavouriteId(undefined);
  }, [isOpen, existingSlot]);

  const showToddlerField = showToddlerLunch(rulesDay, isTrip) === "home" && rulesSlot === MealSlotType.LUNCH;

  const draftMeal = useMemo(
    () =>
      buildMealFromForm(
        existingSlot,
        day,
        slot,
        mainMealText,
        isQuick,
        isMakeAhead,
        isEasy,
        needsTime,
        showToddlerField,
        toddlerFriendly,
        toddlerNote.trim() === "" ? null : toddlerNote.trim(),
      ),
    [
      existingSlot,
      day,
      slot,
      mainMealText,
      isQuick,
      isMakeAhead,
      isEasy,
      needsTime,
      showToddlerField,
      toddlerFriendly,
      toddlerNote,
    ],
  );

  const eggBlocked = eggRuleViolated(rulesDay, mainMealText);

  const handleSave = useCallback(() => {
    if (eggBlocked) return;
    onSave(draftMeal);
    onClose();
  }, [draftMeal, eggBlocked, onClose, onSave]);

  const heading = `${MEAL_PLAN_DAY_LABEL[day]} · ${MEAL_PLAN_SLOT_LABEL[slot]}`;

  return (
    <div
      className={`fixed inset-0 z-[44] flex justify-center bg-[rgba(44,36,22,0.35)] transition-opacity duration-200 ease-out ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`mt-auto flex max-h-[90vh] w-full max-w-[430px] flex-col rounded-t-xl border border-border bg-surface shadow-[0_-8px_24px_rgba(44,36,22,0.12)] transition-transform duration-200 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), var(--space-4))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col px-4 pb-4 pt-2">
          <div className="mb-3 flex flex-col items-center gap-2">
            <div className="h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden />
            <h2 id={titleId} className="text-center text-base font-semibold text-text-primary">
              {heading}
            </h2>
          </div>

          <div className="max-h-[min(60vh,28rem)] flex-1 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <FavouriteMealChips
                selected={selectedFavouriteId}
                onSelect={(meal) => {
                  setSelectedFavouriteId(meal.id);
                  setMainMealText(meal.name);
                }}
              />

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-text-secondary">Meal</span>
                <input
                  type="text"
                  value={mainMealText}
                  onChange={(e) => setMainMealText(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
                  autoComplete="off"
                  placeholder="What are we eating?"
                />
              </label>

              <div className="flex flex-wrap gap-2" aria-label="Meal tags">
                <TagToggle active={isQuick} label="⚡ Quick" onToggle={() => setIsQuick((v) => !v)} />
                <TagToggle active={isMakeAhead} label="🌙 Make-ahead" onToggle={() => setIsMakeAhead((v) => !v)} />
                <TagToggle active={isEasy} label="🟢 Easy" onToggle={() => setIsEasy((v) => !v)} />
                <TagToggle active={needsTime} label="⚠️ Needs time" onToggle={() => setNeedsTime((v) => !v)} />
              </div>

              {showToddlerField ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-secondary">Toddler note</span>
                  <textarea
                    value={toddlerNote}
                    onChange={(e) => setToddlerNote(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
                    placeholder="Optional note for weekend lunch"
                  />
                  <label className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={toddlerFriendly}
                      onChange={(e) => setToddlerFriendly(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-brand"
                    />
                    Toddler same as adults
                  </label>
                </label>
              ) : null}

              {eggBlocked ? (
                <p className="rounded-md border border-error px-3 py-2 text-sm text-error" role="alert">
                  Eggs are not allowed on Saturday for this meal.
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            disabled={eggBlocked}
            onClick={handleSave}
            className="mt-4 min-h-12 w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TagToggle({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-brand bg-brand-surface text-brand-strong"
          : "border-border bg-surface-muted text-text-secondary hover:border-brand hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}
