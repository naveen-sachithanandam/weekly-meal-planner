/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DayColumn } from "../../components/meal-plan-grid/day-column";
import type { MealPlanDay } from "../../lib/types";

function buildDay(overrides: Partial<MealPlanDay> = {}): MealPlanDay {
  return {
    date: "2026-05-12",
    isToddlerHome: false,
    isPast: false,
    slots: [],
    ...overrides,
  };
}

const weekNavigation = {
  onPrevWeek: vi.fn(),
  onNextWeek: vi.fn(),
  canGoPrev: true,
  canGoNext: true,
};

describe("DayColumn", () => {
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

  it("renders day header with day name and formatted date", () => {
    render(
      <DayColumn day={buildDay({ date: "2026-05-12" })} onMutate={onMutate} {...weekNavigation} />,
    );

    expect(screen.getByTestId("day-header")).toBeInTheDocument();
    expect(screen.getByText("Tuesday")).toBeInTheDocument();
    expect(screen.getByText("May 12")).toBeInTheDocument();
  });

  it("renders three meal slot cells for breakfast, lunch, and dinner", () => {
    render(<DayColumn day={buildDay()} onMutate={onMutate} {...weekNavigation} />);

    expect(screen.getByTestId("meal-slot-breakfast")).toBeInTheDocument();
    expect(screen.getByTestId("meal-slot-lunch")).toBeInTheDocument();
    expect(screen.getByTestId("meal-slot-dinner")).toBeInTheDocument();
  });

  it("passes slot data to meal slot cells", () => {
    const day = buildDay({
      slots: [
        {
          id: "slot-1",
          mealType: "LUNCH",
          mealName: "Sambar rice",
          isToddlerAppropriate: true,
          ingredientsStatus: "EMPTY",
          ingredients: [],
        },
      ],
    });

    render(<DayColumn day={day} onMutate={onMutate} {...weekNavigation} />);

    expect(screen.getByTestId("meal-slot-lunch")).toHaveTextContent("Sambar rice");
  });

  it("applies greyed-out styling for past days", () => {
    render(<DayColumn day={buildDay({ isPast: true })} onMutate={onMutate} {...weekNavigation} />);

    const column = screen.getByTestId("day-column");
    expect(column).toHaveAttribute("data-past", "true");
    expect(column.className).toMatch(/opacity-50/);
  });

  it("shows toddler indicator when toddler is home", () => {
    render(<DayColumn day={buildDay({ isToddlerHome: true })} onMutate={onMutate} {...weekNavigation} />);

    expect(screen.getByTestId("toddler-indicator")).toHaveTextContent("Toddler home");
  });

  it("hides toddler toggle on past days", () => {
    render(<DayColumn day={buildDay({ isPast: true })} onMutate={onMutate} {...weekNavigation} />);

    expect(screen.queryByRole("button", { name: /mark toddler/i })).not.toBeInTheDocument();
  });

  it("posts toddler override when marking toddler home", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        override: { date: "2026-05-12", isHome: true },
        conflicts: [],
      }),
    } as Response);

    render(<DayColumn day={buildDay()} onMutate={onMutate} {...weekNavigation} />);

    fireEvent.click(screen.getByRole("button", { name: /mark toddler home/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/toddler-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-05-12", isHome: true }),
      });
    });
    expect(onMutate).toHaveBeenCalled();
  });

  it("prompts on conflicts and re-posts with force when confirmed", async () => {
    const fetchMock = vi.mocked(fetch);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          override: { date: "2026-05-12", isHome: true },
          conflicts: [
            { slotId: "slot-1", mealType: "LUNCH", mealName: "Misal pav" },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          override: { date: "2026-05-12", isHome: true },
          conflicts: [],
        }),
      } as Response);

    render(<DayColumn day={buildDay()} onMutate={onMutate} {...weekNavigation} />);

    fireEvent.click(screen.getByRole("button", { name: /mark toddler home/i }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        expect.stringContaining("Misal pav"),
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/toddler-overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-05-12", isHome: true, force: true }),
    });
    expect(onMutate).toHaveBeenCalled();
  });

  it("does not force-save when conflict prompt is cancelled", async () => {
    const fetchMock = vi.mocked(fetch);
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        override: { date: "2026-05-12", isHome: true },
        conflicts: [
          { slotId: "slot-1", mealType: "LUNCH", mealName: "Misal pav" },
        ],
      }),
    } as Response);

    render(<DayColumn day={buildDay()} onMutate={onMutate} {...weekNavigation} />);

    fireEvent.click(screen.getByRole("button", { name: /mark toddler home/i }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onMutate).not.toHaveBeenCalled();
  });

  it("renders week navigation chevrons and calls callbacks", () => {
    const onPrevWeek = vi.fn();
    const onNextWeek = vi.fn();

    render(
      <DayColumn
        day={buildDay()}
        onMutate={onMutate}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        canGoPrev={false}
        canGoNext={true}
      />,
    );

    const prev = screen.getByRole("button", { name: /previous week/i });
    const next = screen.getByRole("button", { name: /next week/i });

    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    fireEvent.click(next);
    expect(onNextWeek).toHaveBeenCalledTimes(1);
    expect(onPrevWeek).not.toHaveBeenCalled();
  });

  it("marks toddler away without conflict check", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        override: { date: "2026-05-12", isHome: false },
        conflicts: [],
      }),
    } as Response);

    render(
      <DayColumn day={buildDay({ isToddlerHome: true })} onMutate={onMutate} {...weekNavigation} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /mark toddler away/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/toddler-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-05-12", isHome: false }),
      });
    });
    expect(onMutate).toHaveBeenCalled();
  });
});
