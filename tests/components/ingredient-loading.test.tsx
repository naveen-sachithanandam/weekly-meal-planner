/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { IngredientLoading } from "../../components/meal-plan-grid/meal-slot-cell/ingredient-loading";

describe("IngredientLoading", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a spinner and generating label", () => {
    render(<IngredientLoading />);

    expect(screen.getByRole("status")).toHaveTextContent("Generating ingredients…");
  });
});
