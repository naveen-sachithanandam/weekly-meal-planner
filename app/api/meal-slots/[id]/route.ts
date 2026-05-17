import { NextRequest, NextResponse } from "next/server";

import { isPastDay } from "../../../../lib/date";
import { generateIngredients } from "../../../../lib/ollama";
import { prisma } from "../../../../lib/prisma";
import { mealSlotInclude, serializeMealSlot } from "../../../../lib/serialize-meal-slot";

type UpdateMealSlotBody = {
  mealName?: string;
  isToddlerAppropriate?: boolean;
};

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
    include: mealSlotInclude,
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
    include: mealSlotInclude,
  });

  if (mealNameChanged) {
    void generateIngredients(slot.id, slot.mealName);
  }

  return NextResponse.json(serializeMealSlot(slot));
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const existing = await prisma.mealSlot.findUnique({
    where: { id },
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

  await prisma.mealSlot.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
