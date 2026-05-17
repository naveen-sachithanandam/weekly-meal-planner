/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MealSlotEditing } from "../../components/meal-plan-grid/meal-slot-cell/meal-slot-editing";

describe("MealSlotEditing", () => {
  const onSaved = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    onSaved.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function renderEditing(overrides: Partial<Parameters<typeof MealSlotEditing>[0]> = {}) {
    return render(
      <MealSlotEditing
        date="2026-05-15"
        mealTypeConfigId="cfg-lunch"
        onSaved={onSaved}
        onCancel={onCancel}
        {...overrides}
      />,
    );
  }

  it("renders meal name input, toddler checkbox, and action buttons", () => {
    renderEditing();

    expect(screen.getByLabelText(/meal name/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /toddler-appropriate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel without fetch when cancel is clicked", () => {
    renderEditing();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("POSTs meal slot on confirm and calls onSaved then onCancel", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "slot-1" }), { status: 201 }),
    );

    renderEditing();

    fireEvent.change(screen.getByLabelText(/meal name/i), {
      target: { value: "Dal rice" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /toddler-appropriate/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/meal-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: "2026-05-15",
          mealTypeConfigId: "cfg-lunch",
          mealName: "Dal rice",
          isToddlerAppropriate: true,
        }),
      });
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows validation error when meal name is empty", async () => {
    renderEditing();

    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("mealName is required");
    expect(fetch).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("shows API error message when save fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Cannot modify meal slots for past days" }), {
        status: 403,
      }),
    );

    renderEditing();

    fireEvent.change(screen.getByLabelText(/meal name/i), {
      target: { value: "Rasam rice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot modify meal slots for past days",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
