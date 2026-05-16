import { describe, expect, it } from "vitest";

import { getRefreshInterval } from "../../lib/meal-plan-refresh";
import type { MealPlanDay } from "../../lib/types";

function dayWithStatus(status: MealPlanDay["slots"][0]["ingredientsStatus"]): MealPlanDay {
  return {
    date: "2026-05-10",
    isToddlerHome: false,
    isPast: false,
    slots: [
      {
        id: "slot-1",
        mealType: "BREAKFAST",
        mealName: "Oatmeal",
        isToddlerAppropriate: true,
        ingredientsStatus: status,
        ingredients: [],
      },
    ],
  };
}

describe("getRefreshInterval", () => {
  it("returns 3000 when any slot has ingredientsStatus PENDING", () => {
    expect(getRefreshInterval([dayWithStatus("PENDING")])).toBe(3000);
  });

  it("returns 0 when no slots are PENDING", () => {
    expect(getRefreshInterval([dayWithStatus("READY")])).toBe(0);
    expect(getRefreshInterval([dayWithStatus("FAILED")])).toBe(0);
    expect(getRefreshInterval([dayWithStatus("EMPTY")])).toBe(0);
  });

  it("returns 0 when days are undefined or empty", () => {
    expect(getRefreshInterval(undefined)).toBe(0);
    expect(getRefreshInterval([])).toBe(0);
    expect(
      getRefreshInterval([
        {
          date: "2026-05-10",
          isToddlerHome: false,
          isPast: false,
          slots: [],
        },
      ]),
    ).toBe(0);
  });
});
