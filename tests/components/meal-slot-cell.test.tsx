/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MealSlotCell } from "../../components/meal-plan-grid/meal-slot-cell/meal-slot-cell";
import type { MealPlanSlot } from "../../lib/types";

function buildSlot(overrides: Partial<MealPlanSlot> = {}): MealPlanSlot {
  return {
    id: "slot-1",
    mealType: "LUNCH",
    mealName: "Sambar rice",
    isToddlerAppropriate: true,
    ingredientsStatus: "EMPTY",
    ingredients: [],
    ...overrides,
  };
}

describe("MealSlotCell", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders read-only meal name for past days with a slot", () => {
    render(
      <MealSlotCell
        slot={buildSlot()}
        mealType="LUNCH"
        date="2026-05-10"
        isPast
      />,
    );

    const cell = screen.getByTestId("meal-slot-lunch");
    expect(cell).toHaveAttribute("data-past", "true");
    expect(screen.getByText("Sambar rice")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders em dash for past empty slots", () => {
    render(
      <MealSlotCell
        slot={null}
        mealType="BREAKFAST"
        date="2026-05-10"
        isPast
      />,
    );

    expect(screen.getByTestId("meal-slot-breakfast")).toHaveTextContent("—");
    expect(screen.queryByRole("button", { name: /add meal/i })).not.toBeInTheDocument();
  });

  it("renders empty state for future days without a slot", () => {
    render(
      <MealSlotCell
        slot={null}
        mealType="DINNER"
        date="2026-05-12"
        isPast={false}
      />,
    );

    expect(screen.getByRole("button", { name: /add meal/i })).toBeInTheDocument();
  });

  it("enters editing when empty cell add button is clicked", () => {
    render(
      <MealSlotCell
        slot={null}
        mealType="LUNCH"
        date="2026-05-12"
        isPast={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add meal/i }));

    expect(screen.getByLabelText(/meal name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("renders filled state for slots that are not being edited", () => {
    render(
      <MealSlotCell
        slot={buildSlot({ mealName: "Dal rice" })}
        mealType="LUNCH"
        date="2026-05-12"
        isPast={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Dal rice" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/meal name/i)).not.toBeInTheDocument();
  });

  it("enters editing when filled meal name is clicked", () => {
    render(
      <MealSlotCell
        slot={buildSlot()}
        mealType="LUNCH"
        date="2026-05-12"
        isPast={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sambar rice" }));

    expect(screen.getByLabelText(/meal name/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sambar rice" })).not.toBeInTheDocument();
  });
});
