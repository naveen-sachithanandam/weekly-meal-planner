import { MealType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { isPastDay } from "../../../lib/date";
import { generateIngredients, isOllamaReachable } from "../../../lib/ollama";
import { prisma } from "../../../lib/prisma";

const MEAL_TYPES = new Set<string>(Object.values(MealType));

type CreateMealSlotBody = {
  date?: string;
  mealType?: string;
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

function validateBody(body: CreateMealSlotBody): string | null {
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return "date must be YYYY-MM-DD";
  }
  if (!body.mealType || !MEAL_TYPES.has(body.mealType)) {
    return "mealType must be BREAKFAST, LUNCH, or DINNER";
  }
  if (!body.mealName?.trim()) {
    return "mealName is required";
  }
  if (typeof body.isToddlerAppropriate !== "boolean") {
    return "isToddlerAppropriate must be a boolean";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateMealSlotBody;
  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const date = body.date!;
  const mealType = body.mealType as MealType;
  const mealName = body.mealName!.trim();
  const isToddlerAppropriate = body.isToddlerAppropriate!;

  if (isPastDay(date)) {
    return NextResponse.json(
      { error: "Cannot modify meal slots for past days" },
      { status: 403 },
    );
  }

  const existing = await prisma.mealSlot.findUnique({
    where: { date_mealType: { date, mealType } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A meal slot already exists for this date and meal type" },
      { status: 409 },
    );
  }

  const ollamaReachable = await isOllamaReachable();
  const ingredientsStatus = ollamaReachable ? "PENDING" : "EMPTY";

  const slot = await prisma.mealSlot.create({
    data: {
      date,
      mealType,
      mealName,
      isToddlerAppropriate,
      ingredientsStatus,
    },
    include: { ingredients: true },
  });

  if (ollamaReachable) {
    void generateIngredients(slot.id, slot.mealName);
  }

  return NextResponse.json(serializeSlot(slot), { status: 201 });
}
