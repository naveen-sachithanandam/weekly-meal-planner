import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveGetWeekKey, type ShoppingListErrorBody } from "@/lib/shopping-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** POST /api/shopping-list/clear — uncheck every line for the resolved week (pantry `alreadyHave` unchanged). */
export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown = {};
  try {
    json = await request.json();
  } catch {
    json = {};
  }

  const weekStartRaw = isRecord(json) && typeof json.weekStart === "string" ? json.weekStart : null;
  const params = new URLSearchParams();
  if (weekStartRaw !== null && weekStartRaw.trim() !== "") {
    params.set("weekStart", weekStartRaw.trim());
  }
  const resolved = resolveGetWeekKey(params);
  if (!resolved.ok) {
    return NextResponse.json(resolved.body, { status: 400 });
  }

  const plan = await prisma.weeklyPlan.findUnique({
    where: { weekStartSunday: resolved.weekStart },
    select: { id: true },
  });

  if (!plan) {
    return NextResponse.json(
      { error: "No plan found for this week" } satisfies ShoppingListErrorBody,
      { status: 404 },
    );
  }

  try {
    await prisma.shoppingLineGroup.updateMany({
      where: { weeklyPlanId: plan.id },
      data: { checked: false },
    });
    return NextResponse.json({ ok: true as const });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error while clearing checks.";
    return NextResponse.json({ error: message } satisfies ShoppingListErrorBody, { status: 500 });
  }
}
