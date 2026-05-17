import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";

const mealTypeSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
} as const;

type PatchMealTypeBody = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

async function hasDuplicateName(name: string, excludeId: string): Promise<boolean> {
  const mealTypes = await prisma.mealTypeConfig.findMany({
    where: { id: { not: excludeId } },
    select: { name: true },
  });
  const normalized = name.toLowerCase();
  return mealTypes.some((mealType) => mealType.name.toLowerCase() === normalized);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as PatchMealTypeBody;

  if (
    body.name === undefined &&
    body.sortOrder === undefined &&
    body.isActive === undefined
  ) {
    return NextResponse.json(
      { error: "At least one of name, sortOrder, or isActive is required" },
      { status: 400 },
    );
  }

  if (body.sortOrder !== undefined && typeof body.sortOrder !== "number") {
    return NextResponse.json({ error: "sortOrder must be a number" }, { status: 400 });
  }

  if (body.isActive !== undefined && typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  const existing = await prisma.mealTypeConfig.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Meal type not found" }, { status: 404 });
  }

  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    if (await hasDuplicateName(trimmed, id)) {
      return NextResponse.json(
        { error: "A meal type with this name already exists" },
        { status: 409 },
      );
    }
  }

  if (body.isActive === false && existing.isActive) {
    const activeCount = await prisma.mealTypeConfig.count({
      where: { isActive: true },
    });
    if (activeCount <= 1) {
      return NextResponse.json(
        { error: "At least one active meal type must exist" },
        { status: 400 },
      );
    }
  }

  const mealType = await prisma.mealTypeConfig.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
    select: mealTypeSelect,
  });

  return NextResponse.json(mealType);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const existing = await prisma.mealTypeConfig.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Meal type not found" }, { status: 404 });
  }

  const slotCount = await prisma.mealSlot.count({
    where: { mealTypeConfigId: id },
  });

  if (slotCount > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a meal type that has meal slots. Deactivate it instead.",
      },
      { status: 409 },
    );
  }

  await prisma.mealTypeConfig.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
