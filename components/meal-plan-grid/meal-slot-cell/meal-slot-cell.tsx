"use client";

import { useState } from "react";

import type { MealPlanMealType, MealPlanSlot } from "../../../lib/types";
import { MealSlotEditing } from "./meal-slot-editing";
import { MealSlotEmpty } from "./meal-slot-empty";
import { MealSlotFilled } from "./meal-slot-filled";

type MealSlotCellProps = {
  slot: MealPlanSlot | null;
  mealType: MealPlanMealType;
  date: string;
  isPast: boolean;
  onMutate?: () => void | Promise<unknown>;
};

export function MealSlotCell({
  slot,
  mealType,
  date,
  isPast,
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
        <p className="rounded border border-gray-200 px-2 py-2 text-xs text-gray-600">
          {slot?.mealName ?? "—"}
        </p>
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
          onStartEditing={onStartEditing}
          onMutate={onMutate}
        />
      )}
    </div>
  );
}
