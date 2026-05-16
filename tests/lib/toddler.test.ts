import type { ToddlerOverride } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyValidEnv, clearConfigEnv } from "../helpers/env";

function override(date: string, isHome: boolean): ToddlerOverride {
  return { id: `override-${date}`, date, isHome };
}

describe("toddler home schedule", () => {
  beforeEach(() => {
    applyValidEnv();
    vi.resetModules();
  });

  afterEach(() => {
    clearConfigEnv();
    vi.resetModules();
  });

  async function loadToddler() {
    return import("../../lib/toddler");
  }

  it("treats Saturday as toddler home by default", async () => {
    const { isToddlerHome } = await loadToddler();

    expect(isToddlerHome("2026-01-10", [])).toBe(true);
  });

  it("treats Sunday as toddler home by default", async () => {
    const { isToddlerHome } = await loadToddler();

    expect(isToddlerHome("2026-01-11", [])).toBe(true);
  });

  it("treats weekdays as not toddler home by default", async () => {
    const { isToddlerHome } = await loadToddler();

    expect(isToddlerHome("2026-01-12", [])).toBe(false);
    expect(isToddlerHome("2026-01-09", [])).toBe(false);
  });

  it("honours a weekend override when toddler is away", async () => {
    const { isToddlerHome } = await loadToddler();

    expect(
      isToddlerHome("2026-01-10", [override("2026-01-10", false)]),
    ).toBe(false);
  });

  it("honours a weekday override when toddler is home", async () => {
    const { isToddlerHome } = await loadToddler();

    expect(
      isToddlerHome("2026-01-12", [override("2026-01-12", true)]),
    ).toBe(true);
  });

  it("ignores overrides for other dates", async () => {
    const { isToddlerHome } = await loadToddler();

    expect(
      isToddlerHome("2026-01-12", [override("2026-01-09", true)]),
    ).toBe(false);
  });
});
