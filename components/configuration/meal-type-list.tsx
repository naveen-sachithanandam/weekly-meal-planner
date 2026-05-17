"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";

import type { MealTypeConfig, MealTypesResponse } from "../../lib/types";
import { MealTypeRow } from "./meal-type-row";

type MealTypeListProps = {
  mealTypes: MealTypeConfig[];
  onUpdated: () => void | Promise<unknown>;
};

type SortableMealTypeRowProps = {
  mealType: MealTypeConfig;
  isLastActive: boolean;
  onUpdated: () => void | Promise<unknown>;
  isReorderDisabled: boolean;
};

function SortableMealTypeRow({
  mealType,
  isLastActive,
  onUpdated,
  isReorderDisabled,
}: SortableMealTypeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: mealType.id,
    disabled: isReorderDisabled,
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <MealTypeRow
      mealType={mealType}
      isLastActive={isLastActive}
      onUpdated={onUpdated}
      sortableRef={setNodeRef}
      sortableStyle={sortableStyle}
      dragHandleRef={isReorderDisabled ? undefined : setActivatorNodeRef}
      dragHandleProps={
        isReorderDisabled
          ? undefined
          : {
              ...attributes,
              ...listeners,
            }
      }
      isDragging={isDragging}
    />
  );
}

export function MealTypeList({ mealTypes, onUpdated }: MealTypeListProps) {
  const [items, setItems] = useState(mealTypes);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  useEffect(() => {
    setItems(mealTypes);
  }, [mealTypes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (mealTypes.length === 0) {
    return <p className="text-sm text-gray-600">No meal types configured.</p>;
  }

  const activeCount = items.filter((mealType) => mealType.isActive).length;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((mealType) => mealType.id === active.id);
    const newIndex = items.findIndex((mealType) => mealType.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const previousItems = items;
    const reorderedItems = arrayMove(items, oldIndex, newIndex).map((mealType, index) => ({
      ...mealType,
      sortOrder: index + 1,
    }));

    setItems(reorderedItems);
    setReorderError(null);
    setIsReordering(true);

    try {
      const response = await fetch("/api/configuration/meal-types/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reorderedItems.map((mealType) => mealType.id) }),
      });

      if (!response.ok) {
        setItems(previousItems);
        const body = (await response.json()) as { error?: string };
        setReorderError(body.error ?? "Failed to reorder meal types");
        return;
      }

      const body = (await response.json()) as MealTypesResponse;
      setItems(body.mealTypes);
      await onUpdated();
    } catch {
      setItems(previousItems);
      setReorderError("Failed to reorder meal types");
    } finally {
      setIsReordering(false);
    }
  }

  return (
    <>
      {reorderError && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {reorderError}
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        <SortableContext items={items.map((mealType) => mealType.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {items.map((mealType) => (
              <SortableMealTypeRow
                key={mealType.id}
                mealType={mealType}
                isLastActive={mealType.isActive && activeCount === 1}
                onUpdated={onUpdated}
                isReorderDisabled={isReordering}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
