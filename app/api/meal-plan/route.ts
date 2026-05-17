import { addDays, format, parse } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { getWeekStart, isPastDay } from "../../../lib/date";
import { prisma } from "../../../lib/prisma";
import { mealSlotInclude } from "../../../lib/serialize-meal-slot";
import { isToddlerHome } from "../../../lib/toddler";

function weekDates(weekStart: string): string[] {
  const start = parse(weekStart, "yyyy-MM-dd", new Date());
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), "yyyy-MM-dd"),
  );
}

export async function GET(request: NextRequest) {
  const weekParam = request.nextUrl.searchParams.get("week");
  const offsetParam = request.nextUrl.searchParams.get("offset");
  const weekStart = weekParam
    ? weekParam
    : offsetParam !== null && offsetParam !== ""
      ? getWeekStart(Number(offsetParam))
      : getWeekStart();
  const dates = weekDates(weekStart);

  const [mealTypes, slots, overrides] = await Promise.all([
    prisma.mealTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.mealSlot.findMany({
      where: { date: { in: dates } },
      include: mealSlotInclude,
      orderBy: [
        { date: "asc" },
        { mealTypeConfig: { sortOrder: "asc" } },
      ],
    }),
    prisma.toddlerOverride.findMany({
      where: { date: { in: dates } },
    }),
  ]);

  const days = dates.map((date) => ({
    date,
    isToddlerHome: isToddlerHome(date, overrides),
    isPast: isPastDay(date),
    slots: slots
      .filter((slot) => slot.date === date)
      .map((slot) => ({
        id: slot.id,
        mealTypeConfigId: slot.mealTypeConfigId,
        mealTypeName: slot.mealTypeConfig.name,
        mealName: slot.mealName,
        isToddlerAppropriate: slot.isToddlerAppropriate,
        ingredientsStatus: slot.ingredientsStatus,
        ingredients: slot.ingredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          approved: ingredient.approved,
        })),
      })),
  }));

  return NextResponse.json({ weekStart, mealTypes, days });
}
