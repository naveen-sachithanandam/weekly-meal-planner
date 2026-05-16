/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../components/meal-plan-grid/meal-plan-grid", () => ({
  MealPlanGrid: () => <div data-testid="meal-plan-grid">Meal plan grid</div>,
}));

import HomePage from "../../app/page";

describe("HomePage", () => {
  it("renders page title and meal plan grid", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /weekly meal planner/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("meal-plan-grid")).toBeInTheDocument();
  });
});
