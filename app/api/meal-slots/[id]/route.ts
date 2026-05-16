import { MealType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { isPastDay } from "../../../../lib/date";
import { generateIngredients } from "../../../../lib/ollama";
import { prisma } from "../../../../lib/prisma";

type UpdateMealSlotBody = {
  mealName?: string;
  isToddlerAppropriate?: boolean;
};

function serializeSlot(slot: {
  id: string;
  date: string;
  mealType: MealType;
  mealName: string;
  isToddlerAppropriate: boolean;
  ingredientsStatus: string;
  ingredients: { id: string; name: string; approved: boolean }[];
}) {
  return {
    id: slot.id,
    date: slot.date,
    mealType: slot.mealType,
    mealName: slot.mealName,
    isToddlerAppropriate: slot.isToddlerAppropriate,
    ingredientsStatus: slot.ingredientsStatus,
    ingredients: slot.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      approved: ingredient.approved,
    })),
  };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdateMealSlotBody;

  if (
    body.mealName === undefined &&
    body.isToddlerAppropriate === undefined
  ) {
    return NextResponse.json(
      { error: "At least one of mealName or isToddlerAppropriate is required" },
      { status: 400 },
    );
  }

  if (body.mealName !== undefined && !body.mealName.trim()) {
    return NextResponse.json({ error: "mealName cannot be empty" }, { status: 400 });
  }

  if (
    body.isToddlerAppropriate !== undefined &&
    typeof body.isToddlerAppropriate !== "boolean"
  ) {
    return NextResponse.json(
      { error: "isToddlerAppropriate must be a boolean" },
      { status: 400 },
    );
  }

  const existing = await prisma.mealSlot.findUnique({
    where: { id },
    include: { ingredients: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Meal slot not found" }, { status: 404 });
  }

  if (isPastDay(existing.date)) {
    return NextResponse.json(
      { error: "Cannot modify meal slots for past days" },
      { status: 403 },
    );
  }

  const trimmedMealName = body.mealName?.trim();
  const mealNameChanged =
    trimmedMealName !== undefined && trimmedMealName !== existing.mealName;

  const slot = await prisma.mealSlot.update({
    where: { id },
    data: {
      ...(trimmedMealName !== undefined ? { mealName: trimmedMealName } : {}),
      ...(body.isToddlerAppropriate !== undefined
        ? { isToddlerAppropriate: body.isToddlerAppropriate }
        : {}),
      ...(mealNameChanged
        ? {
            ingredientsStatus: "PENDING",
            ingredients: { deleteMany: {} },
          }
        : {}),
    },
    include: { ingredients: true },
  });

  if (mealNameChanged) {
    void generateIngredients(slot.id, slot.mealName);
  }

  return NextResponse.json(serializeSlot(slot));
}
