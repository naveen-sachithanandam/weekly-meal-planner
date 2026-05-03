import type { DayOfWeek, MealSlotType } from "@/types/meal";

/** Tag flags stored per meal slot for rule checks (matches Prisma booleans on `MealSlot`). */
export interface MealTags {
  isQuick: boolean;
  isMakeAhead: boolean;
  isEasy: boolean;
  needsTime: boolean;
}

/** Mon/Tue rush mornings: breakfast must stay light or make-ahead per product spec. */
export function isRushMorning(day: DayOfWeek): boolean {
  return day === "MONDAY" || day === "TUESDAY";
}

/** True when a rush-morning breakfast still flags ⚠️ Needs time unless Quick/Make-ahead/Easy exempt it. */
export function breakfastNeedsWarning(day: DayOfWeek, tags: MealTags): boolean {
  if (!isRushMorning(day)) return false;
  if (tags.isQuick || tags.isMakeAhead || tags.isEasy) return false;
  return tags.needsTime;
}

/** True when free-text meal mentions any spec protein keyword (case-insensitive word match). */
export function hasProtein(mealText: string): boolean {
  const t = mealText.toLowerCase();
  return PROTEIN_SOURCE_REGEX.some((re) => re.test(t));
}

/** True when text mentions eggs in common forms without matching unrelated words like “veggie”. */
export function containsEgg(mealText: string): boolean {
  return EGG_REGEX.test(mealText.toLowerCase());
}

/** Saturday meals must omit eggs—true when rule is broken for this day and text. */
export function eggRuleViolated(day: DayOfWeek, mealText: string): boolean {
  return day === "SATURDAY" && containsEgg(mealText);
}

/** Weekend columns use Sat/Sun-only validation and 🟢 Easy styling rules. */
export function isWeekend(day: DayOfWeek): boolean {
  return day === "SATURDAY" || day === "SUNDAY";
}

/** Weekend slots satisfy the easy/make-ahead bar unless Needs time blocks it. */
export function isEasyEnoughForWeekend(tags: MealTags): boolean {
  if (tags.needsTime) return false;
  return tags.isEasy || tags.isMakeAhead;
}

/** Canonical Friday dinner eat-out applies only when that Friday is not a trip day. */
export function isEatOutSlot(day: DayOfWeek, slot: MealSlotType, isTrip: boolean): boolean {
  return day === "FRIDAY" && slot === "DINNER" && !isTrip;
}

/** Trip mode blanks planning and shopping for the affected calendar day. */
export function tripOverridesDay(isTrip: boolean): boolean {
  return isTrip;
}

/** Where toddler lunch context appears: weekday daycare, weekend at home, or suppressed on trips. */
export function showToddlerLunch(day: DayOfWeek, isTrip: boolean): "daycare" | "home" | "hidden" {
  if (isTrip) return "hidden";
  if (isWeekend(day)) return "home";
  return "daycare";
}

/** Mon–Wed: lunch-box column applies (see SPEC acceptance checklist). */
export function isPackedLunchMonWed(day: DayOfWeek): boolean {
  return day === "MONDAY" || day === "TUESDAY" || day === "WEDNESDAY";
}

/** Tue–Thu: overlapping lunch-box days (see SPEC acceptance checklist). */
export function isPackedLunchTueThu(day: DayOfWeek): boolean {
  return day === "TUESDAY" || day === "WEDNESDAY" || day === "THURSDAY";
}

/** Trip days hide every breakfast/lunch/dinner slot from the editable grid. */
export function slotIsVisible(_day: DayOfWeek, _slot: MealSlotType, isTrip: boolean): boolean {
  return !tripOverridesDay(isTrip);
}

/** Regex list for `hasProtein` — word-boundary safe tokens from product spec + chicken for later menus. */
const PROTEIN_SOURCE_REGEX: RegExp[] = [
  /\beggs?\b/i,
  /\bdal\b/i,
  /\blentils?\b/i,
  /\bchana\b/i,
  /\brajma\b/i,
  /\bmoong\b/i,
  /\bpaneer\b/i,
  /\bcurd\b/i,
  /\byogurt\b/i,
  /\byoghurt\b/i,
  /\bpeanuts?\b/i,
  /\bwalnuts?\b/i,
  /\balmonds?\b/i,
  /\bcashews?\b/i,
  /\bpistachios?\b/i,
  /\bnuts?\b/i,
  /\blegumes?\b/i,
  /\bchicken\b/i,
  /\bfish\b/i,
];

/** Detects “egg” mentions including compounds like egg toast without hitting “veggie”. */
const EGG_REGEX =
  /\beggs?\b|egg-white|eggwhite|omelette|omelet|frittata|bhurji|anda\b/i;
