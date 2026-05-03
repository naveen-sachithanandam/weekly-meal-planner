import type { DayOfWeek, MealSlot } from "@prisma/client";
import useSWR from "swr";
import type { SWRConfiguration } from "swr";

/** Route handler path for GET meal plan (matches `app/api/meal-plan/route.ts`). */
export const MEAL_PLAN_API_PATH = "/api/meal-plan" as const;

/** One day row as returned by GET `/api/meal-plan` (JSON over the wire). */
export interface MealPlanDayApi {
  id: string;
  weeklyPlanId: string;
  dayOfWeek: DayOfWeek;
  isTrip: boolean;
  tripNotes: string | null;
  mealSlots: MealSlot[];
}

/** Weekly plan payload from GET `/api/meal-plan` (ISO date strings for `DateTime` fields). */
export interface MealPlanApiPayload {
  id: string;
  weekStartSunday: string;
  createdAt: string;
  updatedAt: string;
  days: MealPlanDayApi[];
}

/** Thrown when the API returns 404 (no saved plan for that Toronto Sunday week key). */
export class MealPlanNotFoundError extends Error {
  readonly status = 404 as const;
  constructor(message: string) {
    super(message);
    this.name = "MealPlanNotFoundError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.trim() !== "") {
    return body.error;
  }
  return fallback;
}

/** Validates and returns a `MealPlanApiPayload` from GET/POST JSON (shared with mutation hook). */
export function parseMealPlanApiPayload(value: unknown): MealPlanApiPayload {
  if (!isRecord(value)) {
    throw new Error("Invalid meal plan response.");
  }
  if (typeof value.id !== "string" || typeof value.weekStartSunday !== "string") {
    throw new Error("Invalid meal plan response.");
  }
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") {
    throw new Error("Invalid meal plan response.");
  }
  if (!Array.isArray(value.days)) {
    throw new Error("Invalid meal plan response.");
  }
  return value as unknown as MealPlanApiPayload;
}

async function mealPlanFetcher(url: string): Promise<MealPlanApiPayload> {
  const response = await fetch(url);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 404) {
    throw new MealPlanNotFoundError(readErrorMessage(body, "No plan found for this week"));
  }

  if (!response.ok) {
    throw new Error(readErrorMessage(body, `Request failed (${response.status})`));
  }

  return parseMealPlanApiPayload(body);
}

/**
 * Builds the meal-plan GET URL.
 * `weekStart` omitted, null, or empty string → current Toronto week (no query param).
 * Otherwise `weekStart` must be `YYYY-MM-DD` for a valid Toronto Sunday (caller validates).
 */
export function getMealPlanUrl(weekStart?: string | null): string {
  if (weekStart === undefined || weekStart === null || weekStart.trim() === "") {
    return MEAL_PLAN_API_PATH;
  }
  const params = new URLSearchParams({ weekStart: weekStart.trim() });
  return `${MEAL_PLAN_API_PATH}?${params.toString()}`;
}

export function isMealPlanNotFoundError(error: unknown): error is MealPlanNotFoundError {
  return error instanceof MealPlanNotFoundError;
}

export interface UseMealPlanOptions {
  /** Optional SWR overrides (revalidation, suspense, etc.). */
  swr?: SWRConfiguration<MealPlanApiPayload, Error>;
}

/**
 * Loads the weekly meal plan from GET `/api/meal-plan`.
 * @param weekStart Toronto Sunday `YYYY-MM-DD`, or null/undefined for “this week”.
 */
export function useMealPlan(weekStart?: string | null, options?: UseMealPlanOptions) {
  const url = getMealPlanUrl(weekStart);
  return useSWR<MealPlanApiPayload, Error>(url, mealPlanFetcher, options?.swr);
}
