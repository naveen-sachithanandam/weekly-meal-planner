/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IngredientList } from "../../components/meal-plan-grid/meal-slot-cell/ingredient-list";
import type { MealPlanIngredient } from "../../lib/types";

const ingredients: MealPlanIngredient[] = [
  { id: "ing-1", name: "Toor dal", approved: false },
  { id: "ing-2", name: "Rice", approved: true },
];

describe("IngredientList", () => {
  const onMutate = vi.fn();

  beforeEach(() => {
    onMutate.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function renderList(
    overrides: Partial<Parameters<typeof IngredientList>[0]> = {},
  ) {
    return render(
      <IngredientList
        slotId="slot-1"
        ingredients={ingredients}
        ingredientsStatus="READY"
        onMutate={onMutate}
        {...overrides}
      />,
    );
  }

  it("renders ingredients with approve checkboxes", () => {
    renderList();

    expect(screen.getByRole("checkbox", { name: /approve toor dal/i })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /approve rice/i })).toBeChecked();
  });

  it("PATCHes ingredients when approval changes", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ingredients: [
            { id: "ing-1", name: "Toor dal", approved: true },
            { id: "ing-2", name: "Rice", approved: true },
          ],
        }),
        { status: 200 },
      ),
    );

    renderList();

    fireEvent.click(screen.getByRole("checkbox", { name: /approve toor dal/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/meal-slots/slot-1/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: [
            { id: "ing-1", name: "Toor dal", approved: true },
            { id: "ing-2", name: "Rice", approved: true },
          ],
        }),
      });
    });

    expect(onMutate).toHaveBeenCalledTimes(1);
  });

  it("enters inline edit mode and saves edited names", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ingredients: [
            { id: "ing-1", name: "Split toor dal", approved: false },
            { id: "ing-2", name: "Rice", approved: true },
          ],
        }),
        { status: 200 },
      ),
    );

    renderList();

    fireEvent.click(screen.getByRole("button", { name: /edit ingredients/i }));
    fireEvent.change(screen.getByLabelText("Ingredient 1"), {
      target: { value: "Split toor dal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/meal-slots/slot-1/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: [
            { id: "ing-1", name: "Split toor dal", approved: false },
            { id: "ing-2", name: "Rice", approved: true },
          ],
        }),
      });
    });
  });

  it("shows unavailable message and manual add for failed status", () => {
    renderList({ ingredients: [], ingredientsStatus: "FAILED" });

    expect(screen.getByText("Ingredients unavailable. Add manually.")).toBeInTheDocument();
    expect(screen.getByLabelText(/add ingredient/i)).toBeInTheDocument();
  });

  it("PATCHes when a manual ingredient is added", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ingredients: [{ id: "ing-new", name: "Ghee", approved: false }],
        }),
        { status: 200 },
      ),
    );

    renderList({ ingredients: [], ingredientsStatus: "EMPTY", showUnavailableMessage: false });

    fireEvent.change(screen.getByLabelText(/add ingredient/i), {
      target: { value: "Ghee" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/meal-slots/slot-1/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: [{ name: "Ghee", approved: false }],
        }),
      });
    });

    expect(onMutate).toHaveBeenCalledTimes(1);
  });
});
