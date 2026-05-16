import { describe, expect, it } from "vitest";

import { formatWeekRange } from "../../components/meal-plan-grid/week-nav";

describe("formatWeekRange", () => {
  it("returns an empty string before weekStart is available", () => {
    expect(formatWeekRange("")).toBe("");
  });

  it("formats a valid week range", () => {
    expect(formatWeekRange("2026-05-10")).toBe("May 10 – May 16, 2026");
  });

  it("does not throw for invalid date strings", () => {
    expect(formatWeekRange("not-a-date")).toBe("");
  });
});
