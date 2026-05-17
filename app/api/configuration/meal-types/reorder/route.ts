import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";

const mealTypeSelect = {
  id: true,
  name: true,
  sortOrder: true,
  isActive: true,
} as const;

type ReorderMealTypesBody = {
  order?: unknown;
};

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as ReorderMealTypesBody;

  if (!Array.isArray(body.order)) {
    return NextResponse.json({ error: "order must be an array" }, { status: 400 });
  }

  const order = body.order;
  if (order.length === 0) {
    return NextResponse.json({ error: "order cannot be empty" }, { status: 400 });
  }

  if (order.some((id) => typeof id !== "string")) {
    return NextResponse.json(
      { error: "order must contain only meal type ids" },
      { status: 400 },
    );
  }

  const uniqueIds = new Set(order);
  if (uniqueIds.size !== order.length) {
    return NextResponse.json({ error: "order must not contain duplicate ids" }, { status: 400 });
  }

  const existingMealTypes = await prisma.mealTypeConfig.findMany({
    select: { id: true },
  });

  if (order.length !== existingMealTypes.length) {
    return NextResponse.json(
      { error: "order must include every meal type id exactly once" },
      { status: 400 },
    );
  }

  const existingIds = new Set(existingMealTypes.map((mealType) => mealType.id));
  for (const id of order) {
    if (!existingIds.has(id)) {
      return NextResponse.json({ error: "invalid meal type id in order" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    order.map((id, index) =>
      prisma.mealTypeConfig.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  );

  const mealTypes = await prisma.mealTypeConfig.findMany({
    orderBy: { sortOrder: "asc" },
    select: mealTypeSelect,
  });

  return NextResponse.json({ mealTypes });
}
