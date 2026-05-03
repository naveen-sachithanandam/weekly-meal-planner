import { StoreSection, type Prisma } from "@prisma/client";

import { getCurrentWeekStart, parseWeekStartDateString } from "@/lib/week-boundary";

/** Aisle order for shopping list UI (matches `GET /api/shopping-list` sort). */
export const SHOPPING_SECTION_ORDER: readonly StoreSection[] = [
  StoreSection.PRODUCE,
  StoreSection.DAIRY_AND_EGGS,
  StoreSection.DRY_GOODS_AND_GRAINS,
  StoreSection.PANTRY_AND_SPICES,
  StoreSection.FROZEN,
];

const SECTION_RANK: Record<StoreSection, number> = SHOPPING_SECTION_ORDER.reduce(
  (acc, s, i) => {
    acc[s] = i;
    return acc;
  },
  {} as Record<StoreSection, number>,
);

/** Sorts line groups for store walk order, then display name. */
export function sortShoppingLineGroups<T extends { section: StoreSection; displayName: string }>(
  groups: T[],
): void {
  groups.sort((a, b) => {
    const ra = SECTION_RANK[a.section];
    const rb = SECTION_RANK[b.section];
    if (ra !== rb) return ra - rb;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });
}

/** JSON error shape for shopping list routes. */
export interface ShoppingListErrorBody {
  error: string;
  field?: string;
}

export const groupContributionsInclude = {
  contributions: {
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.ShoppingLineGroupInclude;

export type ShoppingLineGroupWithContributions = Prisma.ShoppingLineGroupGetPayload<{
  include: typeof groupContributionsInclude;
}>;

export function resolveGetWeekKey(
  searchParams: URLSearchParams,
): { ok: true; weekStart: Date } | { ok: false; body: ShoppingListErrorBody } {
  const raw = searchParams.get("weekStart");
  if (raw === null || raw.trim() === "") {
    return { ok: true, weekStart: getCurrentWeekStart() };
  }
  const parsed = parseWeekStartDateString(raw);
  if (!parsed) {
    return {
      ok: false,
      body: {
        error: "weekStart must be a Sunday calendar date in America/Toronto (YYYY-MM-DD).",
        field: "weekStart",
      },
    };
  }
  return { ok: true, weekStart: parsed };
}
