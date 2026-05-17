"use client";

import { useState } from "react";

import type { MealPlanMealType, MealPlanSlot } from "../../../lib/types";
import { MealSlotEditing } from "./meal-slot-editing";
import { MealSlotEmpty } from "./meal-slot-empty";
import { MealSlotFilled } from "./meal-slot-filled";
import { MealSlotPast } from "./meal-slot-past";

type MealSlotCellProps = {
  slot: MealPlanSlot | null;
  mealType: MealPlanMealType;
  date: string;
  isPast: boolean;
  isExpanded: boolean;
  onToggleExpand: (slotId: string) => void;
  onMutate?: () => void | Promise<unknown>;
};

export function MealSlotCell({
  slot,
  mealType,
  date,
  isPast,
  isExpanded,
  onToggleExpand,
  onMutate,
}: MealSlotCellProps) {
  const [isEditing, setIsEditing] = useState(false);

  const onStartEditing = () => setIsEditing(true);
  const onCancel = () => setIsEditing(false);
  const onSaved = async () => {
    await onMutate?.();
    setIsEditing(false);
  };

  return (
    <div
      data-testid={`meal-slot-${mealType.name.toLowerCase()}`}
      data-date={date}
      data-past={isPast}
      className="min-h-12"
    >
      {isPast ? (
        slot === null ? (
          <p className="surface-card px-2 py-2 text-center text-xs text-muted">—</p>
        ) : (
          <MealSlotPast
            mealName={slot.mealName}
            ingredientsStatus={slot.ingredientsStatus}
            ingredients={slot.ingredients}
          />
        )
      ) : isEditing ? (
        <MealSlotEditing
          date={date}
          mealTypeConfigId={mealType.id}
          slotId={slot?.id}
          initialMealName={slot?.mealName}
          initialIsToddlerAppropriate={slot?.isToddlerAppropriate}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      ) : slot === null ? (
        <MealSlotEmpty onStartEditing={onStartEditing} />
      ) : (
        <MealSlotFilled
          slotId={slot.id}
          mealName={slot.mealName}
          ingredientsStatus={slot.ingredientsStatus}
          ingredients={slot.ingredients}
          isExpanded={isExpanded}
          onToggleExpand={() => onToggleExpand(slot.id)}
          onStartEditing={onStartEditing}
          onMutate={onMutate}
        />
      )}
    </div>
  );
}
