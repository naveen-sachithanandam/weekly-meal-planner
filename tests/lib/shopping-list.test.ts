import { describe, expect, it } from "vitest";

import { dedupeIngredientNames } from "../../lib/shopping-list";

describe("dedupeIngredientNames", () => {
  it("merges case-insensitive duplicates and sorts", () => {
    expect(dedupeIngredientNames(["Tomatoes", "tomatoes", "Rice", "  rice  "])).toEqual([
      "Rice",
      "Tomatoes",
    ]);
  });

  it("skips blank names", () => {
    expect(dedupeIngredientNames(["", "  ", "Salt"])).toEqual(["Salt"]);
  });

  it("preserves first-seen casing", () => {
    expect(dedupeIngredientNames(["TOOR DAL", "toor dal"])).toEqual(["TOOR DAL"]);
  });
});
