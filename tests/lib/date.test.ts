import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";

/** Thursday 2026-05-14 noon in America/Toronto */
const FIXED_NOW = new Date("2026-05-14T16:00:00.000Z");

describe("home timezone date utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    clearConfigEnv();
    applyValidEnv();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearConfigEnv();
    vi.resetModules();
  });

  async function loadDateUtils() {
    return import("../../lib/date");
  }

  it("returns today as YYYY-MM-DD in the home timezone", async () => {
    const { getToday } = await loadDateUtils();

    expect(getToday()).toBe("2026-05-14");
    expect(getToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns the most recent Sunday for the current week", async () => {
    const { getWeekStart } = await loadDateUtils();

    expect(getWeekStart(0)).toBe("2026-05-10");
    expect(new Date(`${getWeekStart(0)}T12:00:00`).getDay()).toBe(0);
  });

  it("returns next Sunday when offset by one week", async () => {
    const { getWeekStart } = await loadDateUtils();

    expect(getWeekStart(1)).toBe("2026-05-17");
    expect(new Date(`${getWeekStart(1)}T12:00:00`).getDay()).toBe(0);
  });

  it("treats dates before today as past", async () => {
    const { isPastDay } = await loadDateUtils();

    expect(isPastDay("2000-01-01")).toBe(true);
    expect(isPastDay("2026-05-13")).toBe(true);
  });

  it("does not treat today or future dates as past", async () => {
    const { isPastDay } = await loadDateUtils();

    expect(isPastDay("2026-05-14")).toBe(false);
    expect(isPastDay("2099-01-01")).toBe(false);
  });
});
