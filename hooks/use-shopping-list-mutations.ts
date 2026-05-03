"use client";

import type { StoreSection } from "@prisma/client";
import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";

import {
  getShoppingListUrl,
  type ShoppingListApiPayload,
} from "@/hooks/use-shopping-list";
import { replaceGroupInPayload, upsertGroupInPayload } from "@/lib/shopping-list-cache";
import type { ShoppingLineGroupWithContributions } from "@/lib/shopping-utils";

const ITEM_API = "/api/shopping-list/item" as const;
const CLEAR_API = "/api/shopping-list/clear" as const;

function readError(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const e = (body as { error?: unknown }).error;
    if (typeof e === "string" && e.trim() !== "") return e;
  }
  return fallback;
}

export interface UseShoppingListMutationsResult {
  patchChecked: (groupId: string, checked: boolean) => Promise<void>;
  patchAlreadyHave: (groupId: string, alreadyHave: boolean) => Promise<void>;
  addManualItem: (input: {
    displayName: string;
    quantityText: string;
    section: StoreSection;
  }) => Promise<void>;
  clearAllChecks: () => Promise<void>;
  deleteGroupByContributions: (group: ShoppingLineGroupWithContributions) => Promise<void>;
  busy: boolean;
  error: string | null;
}

export function useShoppingListMutations(weekStart: string): UseShoppingListMutationsResult {
  const { mutate } = useSWRConfig();
  const key = getShoppingListUrl(weekStart);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchChecked = useCallback(
    async (groupId: string, checked: boolean) => {
      setError(null);
      try {
        await mutate(
          key,
          async (current: ShoppingListApiPayload | undefined) => {
            if (current === undefined) throw new Error("No shopping list loaded.");
            const res = await fetch(`/api/shopping-list/${groupId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checked }),
            });
            let body: unknown;
            try {
              body = await res.json();
            } catch {
              body = null;
            }
            if (!res.ok) {
              throw new Error(readError(body, `Update failed (${res.status})`));
            }
            return replaceGroupInPayload(current, body as ShoppingLineGroupWithContributions);
          },
          { revalidate: false },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [key, mutate],
  );

  const patchAlreadyHave = useCallback(
    async (groupId: string, alreadyHave: boolean) => {
      setError(null);
      try {
        await mutate(
          key,
          async (current: ShoppingListApiPayload | undefined) => {
            if (current === undefined) throw new Error("No shopping list loaded.");
            const res = await fetch(`/api/shopping-list/${groupId}/have`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ alreadyHave }),
            });
            let body: unknown;
            try {
              body = await res.json();
            } catch {
              body = null;
            }
            if (!res.ok) {
              throw new Error(readError(body, `Update failed (${res.status})`));
            }
            return replaceGroupInPayload(current, body as ShoppingLineGroupWithContributions);
          },
          { revalidate: false },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    },
    [key, mutate],
  );

  const addManualItem = useCallback(
    async (input: { displayName: string; quantityText: string; section: StoreSection }) => {
      setError(null);
      try {
        await mutate(
          key,
          async (current: ShoppingListApiPayload | undefined) => {
            if (current === undefined) throw new Error("No shopping list loaded.");
            const res = await fetch(ITEM_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                weekStart,
                displayName: input.displayName.trim(),
                quantityText: input.quantityText.trim(),
                section: input.section,
                mealSlotId: null,
              }),
            });
            let body: unknown;
            try {
              body = await res.json();
            } catch {
              body = null;
            }
            if (!res.ok) {
              throw new Error(readError(body, `Add failed (${res.status})`));
            }
            if (typeof body !== "object" || body === null || !("group" in body)) {
              throw new Error("Invalid add-item response.");
            }
            const group = (body as { group: ShoppingLineGroupWithContributions }).group;
            return upsertGroupInPayload(current, group);
          },
          { revalidate: false },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Add failed");
      }
    },
    [key, mutate, weekStart],
  );

  const clearAllChecks = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(CLEAR_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok) {
        setError(readError(body, `Clear failed (${res.status})`));
        return;
      }
      await mutate(key, undefined, { revalidate: true });
    } finally {
      setBusy(false);
    }
  }, [key, mutate, weekStart]);

  const deleteGroupByContributions = useCallback(
    async (group: ShoppingLineGroupWithContributions) => {
      setError(null);
      setBusy(true);
      try {
        for (const c of group.contributions) {
          const res = await fetch(`/api/shopping-list/${c.id}`, { method: "DELETE" });
          if (!res.ok) {
            let body: unknown;
            try {
              body = await res.json();
            } catch {
              body = null;
            }
            setError(readError(body, `Remove failed (${res.status})`));
            await mutate(key, undefined, { revalidate: true });
            return;
          }
        }
        await mutate(key, undefined, { revalidate: true });
      } finally {
        setBusy(false);
      }
    },
    [key, mutate],
  );

  return {
    patchChecked,
    patchAlreadyHave,
    addManualItem,
    clearAllChecks,
    deleteGroupByContributions,
    busy,
    error,
  };
}
