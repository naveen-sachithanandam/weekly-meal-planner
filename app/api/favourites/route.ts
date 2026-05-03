import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/** GET /api/favourites — all favourite meals for pick lists (category, then name). */
export async function GET(): Promise<NextResponse> {
  const rows = await prisma.favoriteMeal.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(rows);
}
