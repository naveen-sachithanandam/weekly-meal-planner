import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";

const mealTypeSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
} as const;

type CreateMealTypeBody = {
  name?: string;
};

async function hasDuplicateName(name: string): Promise<boolean> {
  const mealTypes = await prisma.mealTypeConfig.findMany({
    select: { name: true },
  });
  const normalized = name.toLowerCase();
  return mealTypes.some((mealType) => mealType.name.toLowerCase() === normalized);
}

export async function GET() {
  const mealTypes = await prisma.mealTypeConfig.findMany({
    orderBy: { sortOrder: "asc" },
    select: mealTypeSelect,
  });

  return NextResponse.json({ mealTypes });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateMealTypeBody;
  const name = body.name?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (await hasDuplicateName(name)) {
    return NextResponse.json(
      { error: "A meal type with this name already exists" },
      { status: 409 },
    );
  }

  const { _max } = await prisma.mealTypeConfig.aggregate({
    _max: { sortOrder: true },
  });
  const sortOrder = (_max.sortOrder ?? 0) + 1;

  const mealType = await prisma.mealTypeConfig.create({
    data: { name, sortOrder },
    select: mealTypeSelect,
  });

  return NextResponse.json(mealType, { status: 201 });
}
