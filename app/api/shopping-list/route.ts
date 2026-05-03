import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  groupContributionsInclude,
  resolveGetWeekKey,
  sortShoppingLineGroups,
  type ShoppingLineGroupWithContributions,
  type ShoppingListErrorBody,
} from "@/lib/shopping-utils";
import { formatWeekStartDateParam } from "@/lib/week-boundary";

interface ShoppingListGetResponse {
  weekStart: string;
  groups: ShoppingLineGroupWithContributions[];
}

/** GET /api/shopping-list — shopping line groups for optional ?weekStart=YYYY-MM-DD (Sunday) or current Toronto week. */
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = resolveGetWeekKey(new URL(request.url).searchParams);
  if (!resolved.ok) {
    return NextResponse.json(resolved.body, { status: 400 });
  }

  const plan = await prisma.weeklyPlan.findUnique({
    where: { weekStartSunday: resolved.weekStart },
    include: {
      shoppingLineGroups: {
        include: groupContributionsInclude,
      },
    },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "No plan found for this week" } satisfies ShoppingListErrorBody,
      { status: 404 },
    );
  }

  const groups = plan.shoppingLineGroups;
  sortShoppingLineGroups(groups);

  const body: ShoppingListGetResponse = {
    weekStart: formatWeekStartDateParam(resolved.weekStart),
    groups,
  };

  return NextResponse.json(body);
}
