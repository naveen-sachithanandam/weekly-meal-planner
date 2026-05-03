"use client";

import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";

import { formatWeekStartDateParam, parseWeekStartDateString } from "@/lib/week-boundary";

import {
  getMealPlanUrl,
  MEAL_PLAN_API_PATH,
  parseMealPlanApiPayload,
  type MealPlanApiPayload,
} from "./use-meal-plan";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalizes API `weekStartSunday` (short date or ISO) to Toronto Sunday `YYYY-MM-DD` for POST bodies and cache keys. */
export function normalizeWeekStartSunday(raw: string): string {
  const trimmed = raw.trim();
  const parsedShort = parseWeekStartDateString(trimmed);
  if (parsedShort) return formatWeekStartDateParam(parsedShort);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid weekStartSunday on plan payload.");
  }
  return formatWeekStartDateParam(d);
}

/** Builds the JSON body expected by `POST /api/meal-plan` from a loaded plan snapshot. */
export function mealPlanToPostBody(plan: MealPlanApiPayload): {
  weekStartSunday: string;
  days: {
    dayOfWeek: MealPlanApiPayload["days"][number]["dayOfWeek"];
    isTrip: boolean;
    tripNotes: string | null;
    mealSlots: {
      slot: MealPlanApiPayload["days"][number]["mealSlots"][number]["slot"];
      mainMealText: string;
      isQuick: boolean;
      isMakeAhead: boolean;
      isEasy: boolean;
      needsTime: boolean;
      toddlerFriendly: boolean;
      toddlerNote: string | null;
    }[];
  }[];
} {
  return {
    weekStartSunday: normalizeWeekStartSunday(plan.weekStartSunday),
    days: plan.days.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isTrip: day.isTrip,
      tripNotes: day.tripNotes ?? null,
      mealSlots: day.mealSlots.map((ms) => ({
        slot: ms.slot,
        mainMealText: ms.mainMealText,
        isQuick: ms.isQuick,
        isMakeAhead: ms.isMakeAhead,
        isEasy: ms.isEasy,
        needsTime: ms.needsTime,
        toddlerFriendly: ms.toddlerFriendly,
        toddlerNote: ms.toddlerNote,
      })),
    })),
  };
}

function readSaveError(body: unknown, status: number): string {
  if (isRecord(body) && typeof body.error === "string" && body.error.trim() !== "") {
    return body.error;
  }
  return `Save failed (${status})`;
}

export interface UseMealPlanMutationResult {
  /** POSTs the full week to `/api/meal-plan` and revalidates meal-plan SWR cache on success. Returns false on HTTP or network failure. */
  save: (plan: MealPlanApiPayload) => Promise<boolean>;
  isSaving: boolean;
  /** Server or client error message from the last save attempt; cleared when a new save starts. */
  error: string | null;
}

/**
 * Mutation helper for saving the entire weekly plan (per SPEC.md: last write wins, full body POST).
 * @param weekStart Same key passed to `useMealPlan` for the active screen (used for cache revalidation).
 */
export function useMealPlanMutation(weekStart?: string | null): UseMealPlanMutationResult {
  const { mutate } = useSWRConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (plan: MealPlanApiPayload): Promise<boolean> => {
      setError(null);
      setIsSaving(true);
      try {
        const res = await fetch(MEAL_PLAN_API_PATH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mealPlanToPostBody(plan)),
        });

        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = null;
        }

        if (!res.ok) {
          setError(readSaveError(body, res.status));
          return false;
        }

        const updated = parseMealPlanApiPayload(body);
        const savedWeekKey = normalizeWeekStartSunday(updated.weekStartSunday);
        const viewKey = getMealPlanUrl(weekStart);

        await mutate(getMealPlanUrl(savedWeekKey), updated, { revalidate: true });
        if (viewKey !== getMealPlanUrl(savedWeekKey)) {
          await mutate(viewKey, undefined, { revalidate: true });
        }
        await mutate(MEAL_PLAN_API_PATH, undefined, { revalidate: true });
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Save failed.";
        setError(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [mutate, weekStart],
  );

  return { save, isSaving, error };
}
