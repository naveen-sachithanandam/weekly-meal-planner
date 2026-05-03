import type { ShoppingLineGroupWithContributions } from "@/lib/shopping-utils";
import { SHOPPING_SECTION_ORDER } from "@/lib/shopping-utils";

import type { StoreSection } from "@prisma/client";

const byName = (a: ShoppingLineGroupWithContributions, b: ShoppingLineGroupWithContributions) =>
  a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });

/**
 * Within each aisle: still to buy → already at home → bought (checked),
 * matching DESIGN.md checklist ordering.
 */
export function sortGroupsForChecklistView(
  groups: ShoppingLineGroupWithContributions[],
): ShoppingLineGroupWithContributions[] {
  const bySection = new Map<StoreSection, ShoppingLineGroupWithContributions[]>();
  for (const s of SHOPPING_SECTION_ORDER) {
    bySection.set(s, []);
  }
  for (const g of groups) {
    const list = bySection.get(g.section);
    if (list) list.push(g);
  }
  const out: ShoppingLineGroupWithContributions[] = [];
  for (const s of SHOPPING_SECTION_ORDER) {
    const bucket = bySection.get(s) ?? [];
    const toBuy = bucket.filter((g) => !g.alreadyHave && !g.checked).sort(byName);
    const atHome = bucket.filter((g) => g.alreadyHave).sort(byName);
    const bought = bucket.filter((g) => !g.alreadyHave && g.checked).sort(byName);
    out.push(...toBuy, ...atHome, ...bought);
  }
  return out;
}
