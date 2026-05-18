import { describe, expect, it } from "vitest";

import {
  buildWhatsAppShareUrl,
  formatShoppingListShareText,
} from "../../lib/format-shopping-list-share";

describe("formatShoppingListShareText", () => {
  it("formats week header and bullet items", () => {
    const text = formatShoppingListShareText("2026-05-10", ["Rice", "Dal"]);
    expect(text).toBe(
      "Shopping list (week of 2026-05-10)\n\n• Rice\n• Dal",
    );
  });

  it("handles empty list", () => {
    expect(formatShoppingListShareText("2026-05-10", [])).toContain("(no items)");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("encodes text for wa.me", () => {
    const url = buildWhatsAppShareUrl("Hello & bye");
    expect(url).toBe("https://wa.me/?text=Hello%20%26%20bye");
  });
});
