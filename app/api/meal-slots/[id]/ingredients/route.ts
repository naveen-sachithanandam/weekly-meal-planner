import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { mealSlotInclude, serializeMealSlot } from "../../../../../lib/serialize-meal-slot";

type IngredientInput = {
  id?: string;
  name?: string;
  approved?: boolean;
};

type UpdateIngredientsBody = {
  ingredients?: IngredientInput[];
};

function validateIngredients(
  ingredients: IngredientInput[] | undefined,
): string | null {
  if (!Array.isArray(ingredients)) {
    return "ingredients must be an array";
  }

  for (const ingredient of ingredients) {
    if (!ingredient.name?.trim()) {
      return "each ingredient must have a name";
    }
    if (typeof ingredient.approved !== "boolean") {
      return "each ingredient must have an approved boolean";
    }
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdateIngredientsBody;
  const validationError = validateIngredients(body.ingredients);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await prisma.mealSlot.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Meal slot not found" }, { status: 404 });
  }

  const slot = await prisma.mealSlot.update({
    where: { id },
    data: {
      ingredientsStatus: "READY",
      ingredients: {
        deleteMany: {},
        create: body.ingredients!.map((ingredient) => ({
          name: ingredient.name!.trim(),
          approved: ingredient.approved!,
        })),
      },
    },
    include: mealSlotInclude,
  });

  return NextResponse.json(serializeMealSlot(slot));
}
