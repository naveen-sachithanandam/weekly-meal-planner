import { addDays, format, parse } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import { getWeekStart } from "../../../lib/date";
import { prisma } from "../../../lib/prisma";
import { dedupeIngredientNames } from "../../../lib/shopping-list";

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

  const rows = await prisma.ingredient.findMany({
    where: {
      approved: true,
      mealSlot: { date: { in: dates } },
    },
    select: { name: true },
  });

  const items = dedupeIngredientNames(rows.map((row) => row.name));

  return NextResponse.json({ weekStart, items });
}
