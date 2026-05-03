import { StoreSection } from "@prisma/client";
import useSWR from "swr";
import type { SWRConfiguration } from "swr";

import type { ShoppingLineGroupWithContributions } from "@/lib/shopping-utils";

/** Route handler path for GET shopping list (matches `app/api/shopping-list/route.ts`). */
export const SHOPPING_LIST_API_PATH = "/api/shopping-list" as const;

/** Payload from GET `/api/shopping-list` (Toronto Sunday key + aisle-sorted groups). */
export interface ShoppingListApiPayload {
  weekStart: string;
  groups: ShoppingLineGroupWithContributions[];
}

/** Thrown when GET returns 404 (no weekly plan / list for that week key). */
export class ShoppingListNotFoundError extends Error {
  readonly status = 404 as const;
  constructor(message: string) {
    super(message);
    this.name = "ShoppingListNotFoundError";
  }
}

const STORE_SECTION_VALUES = new Set<string>(Object.values(StoreSection));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.trim() !== "") {
    return body.error;
  }
  return fallback;
}

function isStoreSectionValue(v: unknown): v is StoreSection {
  return typeof v === "string" && STORE_SECTION_VALUES.has(v);
}

function isContributionRecord(raw: unknown): raw is ShoppingLineGroupWithContributions["contributions"][number] {
  if (!isRecord(raw)) return false;
  if (typeof raw.id !== "string" || typeof raw.shoppingLineGroupId !== "string") return false;
  if (typeof raw.quantityText !== "string") return false;
  if (typeof raw.sortOrder !== "number") return false;
  if (raw.mergeUnitKey !== null && typeof raw.mergeUnitKey !== "string") return false;
  if (raw.mealSlotId !== null && raw.mealSlotId !== undefined && typeof raw.mealSlotId !== "string") return false;
  return true;
}

function isGroupRecord(raw: unknown): raw is ShoppingLineGroupWithContributions {
  if (!isRecord(raw)) return false;
  if (typeof raw.id !== "string" || typeof raw.weeklyPlanId !== "string") return false;
  if (typeof raw.displayName !== "string" || typeof raw.mergeKey !== "string") return false;
  if (typeof raw.checked !== "boolean" || typeof raw.alreadyHave !== "boolean") return false;
  if (typeof raw.sortOrder !== "number") return false;
  if (!isStoreSectionValue(raw.section)) return false;
  if (!Array.isArray(raw.contributions)) return false;
  if (!raw.contributions.every(isContributionRecord)) return false;
  return true;
}

/**
 * Validates GET `/api/shopping-list` JSON so downstream UI can rely on shape
 * (sections, flags, contribution slices for by-meal / by-aisle / checklist views).
 */
export function parseShoppingListApiPayload(value: unknown): ShoppingListApiPayload {
  if (!isRecord(value)) {
    throw new Error("Invalid shopping list response.");
  }
  if (typeof value.weekStart !== "string" || value.weekStart.trim() === "") {
    throw new Error("Invalid shopping list response.");
  }
  if (!Array.isArray(value.groups)) {
    throw new Error("Invalid shopping list response.");
  }
  for (const g of value.groups) {
    if (!isGroupRecord(g)) {
      throw new Error("Invalid shopping list response.");
    }
  }
  return {
    weekStart: value.weekStart,
    groups: value.groups as ShoppingLineGroupWithContributions[],
  };
}

async function shoppingListFetcher(url: string): Promise<ShoppingListApiPayload> {
  const response = await fetch(url);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 404) {
    throw new ShoppingListNotFoundError(readErrorMessage(body, "No plan found for this week"));
  }

  if (!response.ok) {
    throw new Error(readErrorMessage(body, `Request failed (${response.status})`));
  }

  return parseShoppingListApiPayload(body);
}

/**
 * Builds the shopping-list GET URL.
 * `weekStart` omitted, null, or empty → current Toronto week (no query param).
 */
export function getShoppingListUrl(weekStart?: string | null): string {
  if (weekStart === undefined || weekStart === null || weekStart.trim() === "") {
    return SHOPPING_LIST_API_PATH;
  }
  const params = new URLSearchParams({ weekStart: weekStart.trim() });
  return `${SHOPPING_LIST_API_PATH}?${params.toString()}`;
}

export function isShoppingListNotFoundError(error: unknown): error is ShoppingListNotFoundError {
  return error instanceof ShoppingListNotFoundError;
}

export interface UseShoppingListOptions {
  swr?: SWRConfiguration<ShoppingListApiPayload, Error>;
}

/**
 * Loads consolidated shopping line groups for the week from GET `/api/shopping-list`.
 * @param weekStart Toronto Sunday `YYYY-MM-DD`, or null/undefined for this week.
 */
export function useShoppingList(weekStart?: string | null, options?: UseShoppingListOptions) {
  const url = getShoppingListUrl(weekStart);
  return useSWR<ShoppingListApiPayload, Error>(url, shoppingListFetcher, options?.swr);
}
