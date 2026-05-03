import type { ShoppingLineGroupWithContributions } from "@/lib/shopping-utils";
import { sortShoppingLineGroups } from "@/lib/shopping-utils";

import type { ShoppingListApiPayload } from "@/hooks/use-shopping-list";

export function replaceGroupInPayload(
  payload: ShoppingListApiPayload,
  updated: ShoppingLineGroupWithContributions,
): ShoppingListApiPayload {
  return {
    ...payload,
    groups: payload.groups.map((g) => (g.id === updated.id ? updated : g)),
  };
}

export function upsertGroupInPayload(
  payload: ShoppingListApiPayload,
  group: ShoppingLineGroupWithContributions,
): ShoppingListApiPayload {
  const idx = payload.groups.findIndex((g) => g.id === group.id);
  const next =
    idx === -1 ? [...payload.groups, group] : payload.groups.map((g, i) => (i === idx ? group : g));
  sortShoppingLineGroups(next);
  return { ...payload, groups: next };
}

export function removeContributionFromPayload(
  payload: ShoppingListApiPayload,
  contributionId: string,
): ShoppingListApiPayload {
  const nextGroups: ShoppingLineGroupWithContributions[] = [];
  for (const g of payload.groups) {
    const contribs = g.contributions.filter((c) => c.id !== contributionId);
    if (contribs.length === 0) continue;
    if (contribs.length === g.contributions.length) {
      nextGroups.push(g);
    } else {
      nextGroups.push({ ...g, contributions: contribs });
    }
  }
  return { ...payload, groups: nextGroups };
}
