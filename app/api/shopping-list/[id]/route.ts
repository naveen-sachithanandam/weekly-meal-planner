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

/** DELETE /api/shopping-list/:id — `id` is a ShoppingLineContribution; removes empty parent groups. */
export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const existing = await prisma.shoppingLineContribution.findUnique({
    where: { id },
    select: { shoppingLineGroupId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Shopping line contribution not found.", field: "id" } satisfies ShoppingListErrorBody,
      { status: 404 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.shoppingLineContribution.delete({ where: { id } });
      const remaining = await tx.shoppingLineContribution.count({
        where: { shoppingLineGroupId: existing.shoppingLineGroupId },
      });
      if (remaining === 0) {
        await tx.shoppingLineGroup.delete({ where: { id: existing.shoppingLineGroupId } });
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Database error while deleting shopping line contribution.";
    return NextResponse.json({ error: message } satisfies ShoppingListErrorBody, { status: 500 });
  }
}

/** PATCH /api/shopping-list/:id — `id` is a ShoppingLineGroup; body `{ checked: boolean }` updates `checked` only. */
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

  if (typeof json.checked !== "boolean") {
    return NextResponse.json(
      { error: "checked must be a boolean.", field: "checked" } satisfies ShoppingListErrorBody,
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
      data: { checked: json.checked },
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
    const message = e instanceof Error ? e.message : "Database error while updating shopping line group.";
    return NextResponse.json({ error: message } satisfies ShoppingListErrorBody, { status: 500 });
  }
}
