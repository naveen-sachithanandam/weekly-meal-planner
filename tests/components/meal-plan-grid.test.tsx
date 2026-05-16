/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MealPlanGrid } from "../../components/meal-plan-grid/meal-plan-grid";
import type { MealPlanResponse } from "../../lib/types";

const mockUseSWR = vi.fn();
const mockGetWeekStart = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("../../lib/date", () => ({
  getWeekStart: (offset: number) => mockGetWeekStart(offset),
}));

function buildWeekResponse(weekStart: string): MealPlanResponse {
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = index + 10;
    return {
      date: `2026-05-${String(day).padStart(2, "0")}`,
      isToddlerHome: false,
      isPast: false,
      slots: [],
    };
  });

  return { weekStart, days };
}

describe("MealPlanGrid", () => {
  beforeEach(() => {
    mockGetWeekStart.mockImplementation((offset: number) => {
      if (offset === -1) return "2026-05-03";
      if (offset === 1) return "2026-05-17";
      return "2026-05-10";
    });

    mockUseSWR.mockImplementation((key: string) => {
      const week = key.split("week=")[1];
      return {
        data: buildWeekResponse(week),
        error: undefined,
        isLoading: false,
        mutate: vi.fn(),
      };
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function lastSwrOptions() {
    const call = mockUseSWR.mock.calls.at(-1);
    if (!call) {
      throw new Error("useSWR was not called");
    }
    return call[2] as { refreshInterval: (data?: MealPlanResponse) => number };
  }

  it("renders seven day columns for the current week", () => {
    render(<MealPlanGrid />);

    expect(screen.getAllByTestId("day-column")).toHaveLength(7);
    expect(screen.getByText("2026-05-10")).toBeInTheDocument();
    expect(screen.getByText("2026-05-16")).toBeInTheDocument();
  });

  it("fetches meal plan data keyed by weekStart from getWeekStart(weekOffset)", () => {
    render(<MealPlanGrid />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/meal-plan?week=2026-05-10",
      expect.any(Function),
      expect.objectContaining({ refreshInterval: expect.any(Function) }),
    );
    expect(lastSwrOptions().refreshInterval(buildWeekResponse("2026-05-10"))).toBe(0);
  });

  it("changes weekStart when navigating weeks", () => {
    render(<MealPlanGrid />);

    fireEvent.click(screen.getByRole("button", { name: /next week/i }));

    expect(mockGetWeekStart).toHaveBeenCalledWith(1);
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?week=2026-05-17",
      expect.any(Function),
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole("button", { name: /current week/i }));

    expect(mockGetWeekStart).toHaveBeenCalledWith(0);
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?week=2026-05-10",
      expect.any(Function),
      expect.any(Object),
    );

    fireEvent.click(screen.getByRole("button", { name: /previous week/i }));

    expect(mockGetWeekStart).toHaveBeenCalledWith(-1);
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?week=2026-05-03",
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("disables previous week at the oldest allowed week", () => {
    render(<MealPlanGrid />);

    fireEvent.click(screen.getByRole("button", { name: /previous week/i }));
    expect(screen.getByRole("button", { name: /previous week/i })).toBeDisabled();
  });

  it("sets SWR refreshInterval to 3000 when any slot is PENDING", () => {
    mockUseSWR.mockImplementation((key: string) => {
      const week = key.split("week=")[1];
      const data = buildWeekResponse(week);
      data.days[0].slots = [
        {
          id: "slot-1",
          mealType: "LUNCH",
          mealName: "Soup",
          isToddlerAppropriate: true,
          ingredientsStatus: "PENDING",
          ingredients: [],
        },
      ];
      return { data, error: undefined, isLoading: false, mutate: vi.fn() };
    });

    render(<MealPlanGrid />);

    const pendingData = buildWeekResponse("2026-05-10");
    pendingData.days[0].slots = [
      {
        id: "slot-1",
        mealType: "LUNCH",
        mealName: "Soup",
        isToddlerAppropriate: true,
        ingredientsStatus: "PENDING",
        ingredients: [],
      },
    ];

    expect(lastSwrOptions().refreshInterval(pendingData)).toBe(3000);
  });
});
