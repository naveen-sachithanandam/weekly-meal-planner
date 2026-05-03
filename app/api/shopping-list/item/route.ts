import { StoreSection, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  groupContributionsInclude,
  type ShoppingLineGroupWithContributions,
  type ShoppingListErrorBody,
} from "@/lib/shopping-utils";
import { parseWeekStartDateString } from "@/lib/week-boundary";

type ShoppingLineContributionRow = Prisma.ShoppingLineContributionGetPayload<Record<string, never>>;

interface PostShoppingItemResponse {
  contribution: ShoppingLineContributionRow;
  group: ShoppingLineGroupWithContributions;
}

const STORE_SECTION_VALUES = new Set<string>(Object.values(StoreSection));

function isStoreSectionValue(v: unknown): v is StoreSection {
  return typeof v === "string" && STORE_SECTION_VALUES.has(v);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShoppingListErrorBody(value: unknown): value is ShoppingListErrorBody {
  return (
    isRecord(value) &&
    typeof value.error === "string" &&
    (value.field === undefined || typeof value.field === "string")
  );
}

interface ParsedPostBody {
  weekStartSunday: Date;
  displayName: string;
  quantityText: string;
  section: StoreSection;
  mergeKey: string;
  mergeUnitKey: string | null;
  mealSlotId: string | null;
}

function parseOptionalStringId(raw: unknown, field: string): string | null | ShoppingListErrorBody {
  if (raw === undefined || raw === null) return null;
  if (raw === "") return null;
  if (typeof raw !== "string") {
    return { error: `${field} must be a string or omitted.`, field };
  }
  return raw;
}

function parseOptionalMergeUnitKey(raw: unknown): string | null | ShoppingListErrorBody {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") {
    return { error: "mergeUnitKey must be a string or omitted.", field: "mergeUnitKey" };
  }
  const t = raw.trim();
  return t === "" ? null : t;
}

function parsePostBody(body: unknown): ParsedPostBody | ShoppingListErrorBody {
  if (!isRecord(body)) {
    return { error: "JSON body must be an object." };
  }

  if (typeof body.weekStart !== "string") {
    return { error: "weekStart must be a string (YYYY-MM-DD Sunday).", field: "weekStart" };
  }
  const weekStartSunday = parseWeekStartDateString(body.weekStart);
  if (!weekStartSunday) {
    return {
      error: "weekStart must be a Sunday calendar date in America/Toronto (YYYY-MM-DD).",
      field: "weekStart",
    };
  }

  if (typeof body.displayName !== "string") {
    return { error: "displayName must be a string.", field: "displayName" };
  }
  const displayName = body.displayName.trim();
  if (displayName === "") {
    return { error: "displayName must not be empty.", field: "displayName" };
  }

  if (typeof body.quantityText !== "string") {
    return { error: "quantityText must be a string.", field: "quantityText" };
  }
  const quantityText = body.quantityText;

  if (!isStoreSectionValue(body.section)) {
    return { error: "Invalid StoreSection enum.", field: "section" };
  }
  const section = body.section;

  let mergeKey: string;
  if (body.mergeKey === undefined || body.mergeKey === null) {
    mergeKey = displayName.toLowerCase();
  } else if (typeof body.mergeKey !== "string") {
    return { error: "mergeKey must be a string or omitted.", field: "mergeKey" };
  } else {
    mergeKey = body.mergeKey.trim();
    if (mergeKey === "") {
      return { error: "mergeKey must not be empty when provided.", field: "mergeKey" };
    }
  }

  const mergeUnitParsed = parseOptionalMergeUnitKey(body.mergeUnitKey);
  if (isShoppingListErrorBody(mergeUnitParsed)) return mergeUnitParsed;

  const mealSlotParsed = parseOptionalStringId(body.mealSlotId, "mealSlotId");
  if (isShoppingListErrorBody(mealSlotParsed)) return mealSlotParsed;

  return {
    weekStartSunday,
    displayName,
    quantityText,
    section,
    mergeKey,
    mergeUnitKey: mergeUnitParsed,
    mealSlotId: mealSlotParsed,
  };
}

async function loadGroupWithContributions(
  groupId: string,
): Promise<ShoppingLineGroupWithContributions | null> {
  return prisma.shoppingLineGroup.findUnique({
    where: { id: groupId },
    include: groupContributionsInclude,
  });
}

/** POST /api/shopping-list/item — add a manual (or meal-linked) contribution, merging into an existing group by mergeKey when present. */
export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." } satisfies ShoppingListErrorBody, {
      status: 400,
    });
  }

  const parsed = parsePostBody(json);
  if (isShoppingListErrorBody(parsed)) {
    return NextResponse.json(parsed, { status: 400 });
  }

  const plan = await prisma.weeklyPlan.findUnique({
    where: { weekStartSunday: parsed.weekStartSunday },
    select: { id: true },
  });
  if (!plan) {
    return NextResponse.json(
      { error: "No plan found for this week" } satisfies ShoppingListErrorBody,
      { status: 404 },
    );
  }

  if (parsed.mealSlotId !== null) {
    const slot = await prisma.mealSlot.findFirst({
      where: {
        id: parsed.mealSlotId,
        dayPlan: { weeklyPlanId: plan.id },
      },
      select: { id: true },
    });
    if (!slot) {
      return NextResponse.json(
        { error: "mealSlotId does not exist for this week.", field: "mealSlotId" },
        { status: 400 },
      );
    }
  }

  try {
    const { contribution, groupId } = await prisma.$transaction(async (tx) => {
      const existing = await tx.shoppingLineGroup.findFirst({
        where: { weeklyPlanId: plan.id, mergeKey: parsed.mergeKey },
        select: { id: true },
      });

      let groupId: string;

      if (existing) {
        groupId = existing.id;
        const agg = await tx.shoppingLineContribution.aggregate({
          where: { shoppingLineGroupId: groupId },
          _max: { sortOrder: true },
        });
        const nextSort = (agg._max.sortOrder ?? -1) + 1;

        const contribution = await tx.shoppingLineContribution.create({
          data: {
            shoppingLineGroupId: groupId,
            mealSlotId: parsed.mealSlotId,
            quantityText: parsed.quantityText,
            mergeUnitKey: parsed.mergeUnitKey,
            sortOrder: nextSort,
          },
        });
        return { contribution, groupId };
      }

      const group = await tx.shoppingLineGroup.create({
        data: {
          weeklyPlanId: plan.id,
          section: parsed.section,
          displayName: parsed.displayName,
          mergeKey: parsed.mergeKey,
        },
      });
      groupId = group.id;

      const contribution = await tx.shoppingLineContribution.create({
        data: {
          shoppingLineGroupId: groupId,
          mealSlotId: parsed.mealSlotId,
          quantityText: parsed.quantityText,
          mergeUnitKey: parsed.mergeUnitKey,
          sortOrder: 0,
        },
      });
      return { contribution, groupId };
    });

    const group = await loadGroupWithContributions(groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Item created but group could not be reloaded." } satisfies ShoppingListErrorBody,
        { status: 500 },
      );
    }

    const body: PostShoppingItemResponse = { contribution, group };
    return NextResponse.json(body, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error while adding shopping item.";
    return NextResponse.json({ error: message } satisfies ShoppingListErrorBody, { status: 500 });
  }
}
