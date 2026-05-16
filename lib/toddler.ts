import type { ToddlerOverride } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { HOME_TIMEZONE } from "./config";

function isWeekendInHomeTimezone(date: string): boolean {
  const isoDay = Number(
    formatInTimeZone(`${date}T12:00:00`, HOME_TIMEZONE, "i"),
  );
  return isoDay === 6 || isoDay === 7;
}

export function isToddlerHome(
  date: string,
  overrides: ToddlerOverride[],
): boolean {
  const override = overrides.find((entry) => entry.date === date);
  if (override) {
    return override.isHome;
  }
  return isWeekendInHomeTimezone(date);
}
