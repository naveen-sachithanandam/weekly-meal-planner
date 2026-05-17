/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MealTypeRowLabels } from "../../components/meal-plan-grid/meal-type-row-labels";
import type { MealPlanMealType } from "../../lib/types";

const mealTypes: MealPlanMealType[] = [
  { id: "cfg-a", name: "Breakfast", sortOrder: 1 },
  { id: "cfg-b", name: "Lunch", sortOrder: 2 },
];

describe("MealTypeRowLabels", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a label per meal type with visible name text", () => {
    render(<MealTypeRowLabels mealTypes={mealTypes} />);

    expect(screen.getByTestId("meal-type-label-breakfast")).toHaveTextContent(
      "Breakfast",
    );
    expect(screen.getByTestId("meal-type-label-lunch")).toHaveTextContent("Lunch");
  });

  it("renders one label row for each meal type in the array", () => {
    render(<MealTypeRowLabels mealTypes={mealTypes} />);

    const column = screen.getByTestId("meal-type-row-labels");
    expect(column.querySelectorAll("[data-testid^='meal-type-label-']")).toHaveLength(
      2,
    );
  });

  it("includes a header spacer for alignment with day columns", () => {
    render(<MealTypeRowLabels mealTypes={mealTypes} />);

    const column = screen.getByTestId("meal-type-row-labels");
    expect(column.querySelector(".min-h-\\[4\\.5rem\\]")).toBeInTheDocument();
  });
});
