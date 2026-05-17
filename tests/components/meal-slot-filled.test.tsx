/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MealSlotFilled } from "../../components/meal-plan-grid/meal-slot-cell/meal-slot-filled";
import type { MealPlanIngredient } from "../../lib/types";

const ingredients: MealPlanIngredient[] = [
  { id: "ing-1", name: "Toor dal", approved: false },
  { id: "ing-2", name: "Rice", approved: true },
];

describe("MealSlotFilled", () => {
  const onStartEditing = vi.fn();
  const onMutate = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderFilled(
    overrides: Partial<Parameters<typeof MealSlotFilled>[0]> = {},
  ) {
    return render(
      <MealSlotFilled
        slotId="slot-1"
        mealName="Sambar rice"
        ingredientsStatus="READY"
        ingredients={ingredients}
        onStartEditing={onStartEditing}
        onMutate={onMutate}
        {...overrides}
      />,
    );
  }

  it("renders the meal name and calls onStartEditing when clicked", () => {
    renderFilled();

    fireEvent.click(screen.getByRole("button", { name: "Sambar rice" }));

    expect(onStartEditing).toHaveBeenCalledTimes(1);
  });

  it("shows the loading state when ingredients are pending", () => {
    renderFilled({ ingredientsStatus: "PENDING", ingredients: [] });

    expect(screen.getByRole("status")).toHaveTextContent("Generating ingredients…");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows the ingredient list when ingredients are ready", () => {
    renderFilled();

    expect(screen.getByRole("checkbox", { name: /approve toor dal/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /approve rice/i })).toBeInTheDocument();
    expect(
      screen.queryByText("Ingredients unavailable. Add manually."),
    ).not.toBeInTheDocument();
  });

  it("shows unavailable message and manual add for failed slots", () => {
    renderFilled({ ingredientsStatus: "FAILED", ingredients: [] });

    expect(screen.getByText("Ingredients unavailable. Add manually.")).toBeInTheDocument();
    expect(screen.getByLabelText(/add ingredient/i)).toBeInTheDocument();
  });

  it("shows unavailable message and manual add for empty slots", () => {
    renderFilled({ ingredientsStatus: "EMPTY", ingredients: [] });

    expect(screen.getByText("Ingredients unavailable. Add manually.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  describe("tile actions (AC-010)", () => {
    beforeEach(() => {
      onMutate.mockResolvedValue(undefined);
      vi.stubGlobal("fetch", vi.fn());
      vi.stubGlobal("confirm", vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("shows Edit meal and Delete meal buttons with accessible labels", () => {
      renderFilled();

      expect(screen.getByRole("button", { name: "Edit meal" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Delete meal" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Edit ingredients" })).toBeInTheDocument();
    });

    it("calls onStartEditing when Edit meal is clicked", () => {
      renderFilled();

      fireEvent.click(screen.getByRole("button", { name: "Edit meal" }));

      expect(onStartEditing).toHaveBeenCalledTimes(1);
    });

    it("does not delete when confirmation is cancelled", async () => {
      vi.mocked(window.confirm).mockReturnValue(false);
      renderFilled();

      fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));

      expect(window.confirm).toHaveBeenCalledWith("Remove this meal?");
      expect(fetch).not.toHaveBeenCalled();
      expect(onMutate).not.toHaveBeenCalled();
    });

    it("DELETEs the slot and calls onMutate when confirmed", async () => {
      vi.mocked(window.confirm).mockReturnValue(true);
      vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
      renderFilled();

      fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/meal-slots/slot-1", {
          method: "DELETE",
        });
      });
      expect(onMutate).toHaveBeenCalledTimes(1);
    });

    it("shows an error when DELETE fails", async () => {
      vi.mocked(window.confirm).mockReturnValue(true);
      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify({ error: "Cannot delete past meals" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      );
      renderFilled();

      fireEvent.click(screen.getByRole("button", { name: "Delete meal" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Cannot delete past meals",
      );
      expect(onMutate).not.toHaveBeenCalled();
    });
  });
});
