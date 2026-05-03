import { DayOfWeek, MealSlotType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  breakfastNeedsWarning,
  eggRuleViolated,
  hasProtein,
  type MealTags,
} from "@/lib/meal-rules";
import type { DayOfWeek as RulesDayOfWeek } from "@/types/meal";
import {
  getCurrentWeekStart,
  parseWeekStartDateString,
  isSundayMidnightToronto,
} from "@/lib/week-boundary";

/** JSON error shape for this route. */
interface MealPlanErrorBody {
  error: string;
  field?: string;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

const DAY_ORDER: readonly DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

const SLOT_ORDER: readonly MealSlotType[] = [
  MealSlotType.BREAKFAST,
  MealSlotType.LUNCH,
  MealSlotType.DINNER,
];

const DAY_RANK: Record<DayOfWeek, number> = DAY_ORDER.reduce(
  (acc, d, i) => {
    acc[d] = i;
    return acc;
  },
  {} as Record<DayOfWeek, number>,
);

const SLOT_RANK: Record<MealSlotType, number> = SLOT_ORDER.reduce(
  (acc, s, i) => {
    acc[s] = i;
    return acc;
  },
  {} as Record<MealSlotType, number>,
);

/** Loads one weekly plan with nested days and meal slots, ordered Sun→Sat and breakfast→dinner. */
async function loadWeeklyPlanForWeekStart(db: DbClient, weekStartSunday: Date) {
  const row = await db.weeklyPlan.findUnique({
    where: { weekStartSunday },
    include: {
      days: { include: { mealSlots: true } },
    },
  });

  if (!row) return null;

  row.days.sort((a, b) => DAY_RANK[a.dayOfWeek] - DAY_RANK[b.dayOfWeek]);
  for (const d of row.days) {
    d.mealSlots.sort((a, b) => SLOT_RANK[a.slot] - SLOT_RANK[b.slot]);
  }
  return row;
}

function resolveGetWeekKey(
  searchParams: URLSearchParams,
): { ok: true; weekStart: Date } | { ok: false; body: MealPlanErrorBody } {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMealPlanErrorBody(value: unknown): value is MealPlanErrorBody {
  return (
    isRecord(value) &&
    typeof value.error === "string" &&
    (value.field === undefined || typeof value.field === "string")
  );
}

const PRISMA_DAY_VALUES = new Set<string>(Object.values(DayOfWeek));
const PRISMA_SLOT_VALUES = new Set<string>(Object.values(MealSlotType));

function isDayOfWeekValue(v: unknown): v is DayOfWeek {
  return typeof v === "string" && PRISMA_DAY_VALUES.has(v);
}

function isMealSlotValue(v: unknown): v is MealSlotType {
  return typeof v === "string" && PRISMA_SLOT_VALUES.has(v);
}

interface ParsedMealSlot {
  slot: MealSlotType;
  mainMealText: string;
  isQuick: boolean;
  isMakeAhead: boolean;
  isEasy: boolean;
  needsTime: boolean;
  toddlerFriendly: boolean;
  toddlerNote: string | null;
}

interface ParsedDay {
  dayOfWeek: DayOfWeek;
  isTrip: boolean;
  tripNotes: string | null;
  mealSlots: ParsedMealSlot[];
}

interface ParsedSaveBody {
  weekStartSunday: Date;
  days: ParsedDay[];
}

function parseMealSlot(raw: unknown, fieldPrefix: string): ParsedMealSlot | MealPlanErrorBody {
  if (!isRecord(raw)) {
    return { error: "Each mealSlot must be an object.", field: fieldPrefix };
  }
  if (!isMealSlotValue(raw.slot)) {
    return { error: "Invalid meal slot enum.", field: `${fieldPrefix}.slot` };
  }
  if (typeof raw.mainMealText !== "string") {
    return { error: "mainMealText must be a string.", field: `${fieldPrefix}.mainMealText` };
  }
  if (typeof raw.isQuick !== "boolean") {
    return { error: "isQuick must be a boolean.", field: `${fieldPrefix}.isQuick` };
  }
  if (typeof raw.isMakeAhead !== "boolean") {
    return { error: "isMakeAhead must be a boolean.", field: `${fieldPrefix}.isMakeAhead` };
  }
  if (typeof raw.isEasy !== "boolean") {
    return { error: "isEasy must be a boolean.", field: `${fieldPrefix}.isEasy` };
  }
  if (typeof raw.needsTime !== "boolean") {
    return { error: "needsTime must be a boolean.", field: `${fieldPrefix}.needsTime` };
  }
  if (typeof raw.toddlerFriendly !== "boolean") {
    return { error: "toddlerFriendly must be a boolean.", field: `${fieldPrefix}.toddlerFriendly` };
  }
  if (raw.toddlerNote !== null && typeof raw.toddlerNote !== "string") {
    return { error: "toddlerNote must be a string or null.", field: `${fieldPrefix}.toddlerNote` };
  }
  return {
    slot: raw.slot,
    mainMealText: raw.mainMealText,
    isQuick: raw.isQuick,
    isMakeAhead: raw.isMakeAhead,
    isEasy: raw.isEasy,
    needsTime: raw.needsTime,
    toddlerFriendly: raw.toddlerFriendly,
    toddlerNote: raw.toddlerNote === null ? null : raw.toddlerNote,
  };
}

function parseDay(raw: unknown, index: number): ParsedDay | MealPlanErrorBody {
  const prefix = `days[${index}]`;
  if (!isRecord(raw)) {
    return { error: "Each day must be an object.", field: prefix };
  }
  if (!isDayOfWeekValue(raw.dayOfWeek)) {
    return { error: "Invalid dayOfWeek enum.", field: `${prefix}.dayOfWeek` };
  }
  if (typeof raw.isTrip !== "boolean") {
    return { error: "isTrip must be a boolean.", field: `${prefix}.isTrip` };
  }
  if (raw.tripNotes !== undefined && raw.tripNotes !== null && typeof raw.tripNotes !== "string") {
    return { error: "tripNotes must be a string or null.", field: `${prefix}.tripNotes` };
  }
  if (!Array.isArray(raw.mealSlots)) {
    return { error: "mealSlots must be an array.", field: `${prefix}.mealSlots` };
  }
  const mealSlots: ParsedMealSlot[] = [];
  let i = 0;
  for (const ms of raw.mealSlots) {
    const parsedSlot = parseMealSlot(ms, `${prefix}.mealSlots[${i}]`);
    if (isMealPlanErrorBody(parsedSlot)) {
      return parsedSlot;
    }
    mealSlots.push(parsedSlot);
    i += 1;
  }
  return {
    dayOfWeek: raw.dayOfWeek,
    isTrip: raw.isTrip,
    tripNotes: raw.tripNotes ?? null,
    mealSlots,
  };
}

function parseSaveBody(body: unknown): ParsedSaveBody | MealPlanErrorBody {
  if (!isRecord(body)) {
    return { error: "JSON body must be an object." };
  }
  if (typeof body.weekStartSunday !== "string") {
    return { error: "weekStartSunday must be an ISO-like date string (YYYY-MM-DD).", field: "weekStartSunday" };
  }

  let weekStart: Date | null = parseWeekStartDateString(body.weekStartSunday);
  if (!weekStart) {
    const asInstant = new Date(body.weekStartSunday);
    if (!Number.isNaN(asInstant.getTime()) && isSundayMidnightToronto(asInstant)) {
      weekStart = asInstant;
    }
  }
  if (!weekStart) {
    return {
      error: "weekStartSunday must be Sunday 00:00 America/Toronto (use YYYY-MM-DD for the Sunday date).",
      field: "weekStartSunday",
    };
  }

  if (!Array.isArray(body.days)) {
    return { error: "days must be an array.", field: "days" };
  }

  const days: ParsedDay[] = [];
  let di = 0;
  for (const d of body.days) {
    const parsedDay = parseDay(d, di);
    if (isMealPlanErrorBody(parsedDay)) {
      return parsedDay;
    }
    days.push(parsedDay);
    di += 1;
  }

  return { weekStartSunday: weekStart, days };
}

function validateEggs(days: ParsedDay[]): MealPlanErrorBody | null {
  for (const day of days) {
    const dow = day.dayOfWeek as RulesDayOfWeek;
    for (const ms of day.mealSlots) {
      if (eggRuleViolated(dow, ms.mainMealText)) {
        return {
          error:
            "Eggs are not allowed on Saturday (family rule). Remove egg dishes from every Saturday meal.",
          field: `days.${day.dayOfWeek}.${ms.slot}.mainMealText`,
        };
      }
    }
  }
  return null;
}

function computeProteinWarning(day: DayOfWeek, slot: MealSlotType, ms: ParsedMealSlot): boolean {
  const tags: MealTags = {
    isQuick: ms.isQuick,
    isMakeAhead: ms.isMakeAhead,
    isEasy: ms.isEasy,
    needsTime: ms.needsTime,
  };
  const dow = day as RulesDayOfWeek;
  const proteinMissing = !hasProtein(ms.mainMealText);
  const rushBreakfastFlag =
    slot === MealSlotType.BREAKFAST && breakfastNeedsWarning(dow, tags);
  return proteinMissing || rushBreakfastFlag;
}

/** GET /api/meal-plan — load plan for optional ?weekStart=YYYY-MM-DD (Sunday) or current Toronto week. */
export async function GET(request: Request): Promise<NextResponse> {
  const resolved = resolveGetWeekKey(new URL(request.url).searchParams);
  if (!resolved.ok) {
    return NextResponse.json(resolved.body, { status: 400 });
  }

  const plan = await loadWeeklyPlanForWeekStart(prisma, resolved.weekStart);
  if (!plan) {
    return NextResponse.json(
      { error: "No plan found for this week" } satisfies MealPlanErrorBody,
      { status: 404 },
    );
  }

  return NextResponse.json(plan);
}

/** POST /api/meal-plan — upsert full nested plan for one Sunday week key (last write wins). */
export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = parseSaveBody(json);
  if (isMealPlanErrorBody(parsedBody)) {
    return NextResponse.json(parsedBody, { status: 400 });
  }

  const eggErr = validateEggs(parsedBody.days);
  if (eggErr) {
    return NextResponse.json(eggErr, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const planRow = await tx.weeklyPlan.upsert({
        where: { weekStartSunday: parsedBody.weekStartSunday },
        create: { weekStartSunday: parsedBody.weekStartSunday },
        update: {},
      });

      for (const day of parsedBody.days) {
        const dayRow = await tx.dayPlan.upsert({
          where: {
            weeklyPlanId_dayOfWeek: {
              weeklyPlanId: planRow.id,
              dayOfWeek: day.dayOfWeek,
            },
          },
          create: {
            weeklyPlanId: planRow.id,
            dayOfWeek: day.dayOfWeek,
            isTrip: day.isTrip,
            tripNotes: day.tripNotes,
          },
          update: {
            isTrip: day.isTrip,
            tripNotes: day.tripNotes,
          },
        });

        for (const ms of day.mealSlots) {
          const proteinWarning = computeProteinWarning(day.dayOfWeek, ms.slot, ms);
          await tx.mealSlot.upsert({
            where: {
              dayPlanId_slot: {
                dayPlanId: dayRow.id,
                slot: ms.slot,
              },
            },
            create: {
              dayPlanId: dayRow.id,
              slot: ms.slot,
              mainMealText: ms.mainMealText,
              proteinWarning,
              isQuick: ms.isQuick,
              isMakeAhead: ms.isMakeAhead,
              isEasy: ms.isEasy,
              needsTime: ms.needsTime,
              toddlerFriendly: ms.toddlerFriendly,
              toddlerNote: ms.toddlerNote,
            },
            update: {
              mainMealText: ms.mainMealText,
              proteinWarning,
              isQuick: ms.isQuick,
              isMakeAhead: ms.isMakeAhead,
              isEasy: ms.isEasy,
              needsTime: ms.needsTime,
              toddlerFriendly: ms.toddlerFriendly,
              toddlerNote: ms.toddlerNote,
            },
          });
        }
      }

    });

    const full = await loadWeeklyPlanForWeekStart(prisma, parsedBody.weekStartSunday);
    if (!full) {
      return NextResponse.json(
        { error: "Plan saved but could not be reloaded." },
        { status: 500 },
      );
    }

    return NextResponse.json(full);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Database error while saving plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
