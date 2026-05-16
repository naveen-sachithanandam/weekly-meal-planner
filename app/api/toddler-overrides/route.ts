import { NextRequest, NextResponse } from "next/server";

import { prisma } from "../../../lib/prisma";

type ToddlerOverrideBody = {
  date?: string;
  isHome?: boolean;
  force?: boolean;
};

function validateBody(body: ToddlerOverrideBody): string | null {
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return "date must be YYYY-MM-DD";
  }
  if (typeof body.isHome !== "boolean") {
    return "isHome must be a boolean";
  }
  if (body.force !== undefined && typeof body.force !== "boolean") {
    return "force must be a boolean";
  }
  return null;
}

async function findConflicts(date: string) {
  const slots = await prisma.mealSlot.findMany({
    where: { date, isToddlerAppropriate: false },
    orderBy: { mealType: "asc" },
  });

  return slots.map((slot) => ({
    slotId: slot.id,
    mealType: slot.mealType,
    mealName: slot.mealName,
  }));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ToddlerOverrideBody;
  const validationError = validateBody(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const date = body.date!;
  const isHome = body.isHome!;
  const force = body.force ?? false;
  const overridePreview = { date, isHome };

  if (isHome && !force) {
    const conflicts = await findConflicts(date);
    if (conflicts.length > 0) {
      return NextResponse.json({
        override: overridePreview,
        conflicts,
      });
    }
  }

  const saved = await prisma.toddlerOverride.upsert({
    where: { date },
    create: { date, isHome },
    update: { isHome },
  });

  return NextResponse.json({
    override: { date: saved.date, isHome: saved.isHome },
    conflicts: [],
  });
}
