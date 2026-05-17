import { NextRequest, NextResponse } from "next/server";

import { isPastDay } from "../../../lib/date";
import {
  isOllamaReachable,
  scheduleIngredientGeneration,
} from "../../../lib/ollama";
import { prisma } from "../../../lib/prisma";
import { mealSlotInclude, serializeMealSlot } from "../../../lib/serialize-meal-slot";

type CreateMealSlotBody = {
  date?: string;
  mealTypeConfigId?: string;
  mealName?: string;
  isToddlerAppropriate?: boolean;
};

function validateBody(body: CreateMealSlotBody): string | null {
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return "date must be YYYY-MM-DD";
  }
  if (!body.mealTypeConfigId?.trim()) {
    return "mealTypeConfigId is required";
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
  const mealTypeConfigId = body.mealTypeConfigId!.trim();
  const mealName = body.mealName!.trim();
  const isToddlerAppropriate = body.isToddlerAppropriate!;

  if (isPastDay(date)) {
    return NextResponse.json(
      { error: "Cannot modify meal slots for past days" },
      { status: 403 },
    );
  }

  const mealTypeConfig = await prisma.mealTypeConfig.findFirst({
    where: { id: mealTypeConfigId, isActive: true },
  });
  if (!mealTypeConfig) {
    return NextResponse.json(
      { error: "mealTypeConfigId must reference an active meal type" },
      { status: 400 },
    );
  }

  const existing = await prisma.mealSlot.findUnique({
    where: {
      date_mealTypeConfigId: { date, mealTypeConfigId },
    },
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
      mealTypeConfigId,
      mealName,
      isToddlerAppropriate,
      ingredientsStatus,
    },
    include: mealSlotInclude,
  });

  if (ollamaReachable) {
    scheduleIngredientGeneration(slot.id, slot.mealName);
  }

  return NextResponse.json(serializeMealSlot(slot), { status: 201 });
}
