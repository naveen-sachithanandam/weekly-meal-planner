import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  groupContributionsInclude,
  type ShoppingLineGroupWithContributions,
  type ShoppingListErrorBody,
} from "@/lib/shopping-utils";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadGroupWithContributions(
  groupId: string,
): Promise<ShoppingLineGroupWithContributions | null> {
  return prisma.shoppingLineGroup.findUnique({
    where: { id: groupId },
    include: groupContributionsInclude,
  });
}

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/shopping-list/:id/have — `id` is a ShoppingLineGroup; body `{ alreadyHave: boolean }` updates pantry flag only (not cleared by weekly clear-checks). */
export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." } satisfies ShoppingListErrorBody, {
      status: 400,
    });
  }

  if (!isRecord(json)) {
    return NextResponse.json({ error: "JSON body must be an object." } satisfies ShoppingListErrorBody, {
      status: 400,
    });
  }

  if (typeof json.alreadyHave !== "boolean") {
    return NextResponse.json(
      { error: "alreadyHave must be a boolean.", field: "alreadyHave" } satisfies ShoppingListErrorBody,
      { status: 400 },
    );
  }

  const groupExists = await prisma.shoppingLineGroup.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!groupExists) {
    return NextResponse.json(
      { error: "Shopping line group not found.", field: "id" } satisfies ShoppingListErrorBody,
      { status: 404 },
    );
  }

  try {
    await prisma.shoppingLineGroup.update({
      where: { id },
      data: { alreadyHave: json.alreadyHave },
    });

    const group = await loadGroupWithContributions(id);
    if (!group) {
      return NextResponse.json(
        { error: "Group updated but could not be reloaded." } satisfies ShoppingListErrorBody,
        { status: 500 },
      );
    }

    return NextResponse.json(group);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Database error while updating shopping line group.";
    return NextResponse.json({ error: message } satisfies ShoppingListErrorBody, { status: 500 });
  }
}
