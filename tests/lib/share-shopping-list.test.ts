import { afterEach, describe, expect, it, vi } from "vitest";

import { shareShoppingList } from "../../lib/share-shopping-list";

describe("shareShoppingList", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses navigator.share when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: () => true,
      clipboard: { writeText: vi.fn() },
    });

    const result = await shareShoppingList("2026-05-10", ["Rice"]);
    expect(result).toEqual({ method: "share" });
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Shopping list",
        text: expect.stringContaining("Rice"),
      }),
    );
  });

  it("copies to clipboard when share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    const result = await shareShoppingList("2026-05-10", ["Rice"]);
    expect(result).toEqual({ method: "copy" });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Rice"));
  });

  it("rethrows AbortError when user cancels share sheet", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("cancel"), { name: "AbortError" }));
    vi.stubGlobal("navigator", {
      share,
      canShare: () => true,
    });

    await expect(shareShoppingList("2026-05-10", ["Rice"])).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
