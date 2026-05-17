/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MealPlanGrid } from "../../components/meal-plan-grid/meal-plan-grid";
import type { MealPlanResponse } from "../../lib/types";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
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

  return {
    weekStart,
    mealTypes: [
      { id: "cfg-breakfast", name: "Breakfast", sortOrder: 1 },
      { id: "cfg-lunch", name: "Lunch", sortOrder: 2 },
      { id: "cfg-dinner", name: "Dinner", sortOrder: 3 },
    ],
    days,
  };
}

describe("MealPlanGrid", () => {
  beforeEach(() => {
    mockUseSWR.mockImplementation((key: string) => {
      const offset = Number(key.split("offset=")[1] ?? "0");
      const weekStart =
        offset === -1 ? "2026-05-03" : offset === 1 ? "2026-05-17" : "2026-05-10";
      return {
        data: buildWeekResponse(weekStart),
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
    expect(screen.getByText("May 10")).toBeInTheDocument();
    expect(screen.getByText("May 16")).toBeInTheDocument();
  });

  it("renders meal type row labels from API mealTypes", () => {
    render(<MealPlanGrid />);

    expect(screen.getByTestId("meal-type-row-labels")).toBeInTheDocument();
    expect(screen.getByTestId("meal-type-label-breakfast")).toHaveTextContent(
      "Breakfast",
    );
    expect(screen.getByTestId("meal-type-label-lunch")).toHaveTextContent("Lunch");
    expect(screen.getByTestId("meal-type-label-dinner")).toHaveTextContent(
      "Dinner",
    );
  });

  it("shows one row label per active meal type from the API", () => {
    mockUseSWR.mockImplementation(() => ({
      data: {
        ...buildWeekResponse("2026-05-10"),
        mealTypes: [
          { id: "cfg-breakfast", name: "Breakfast", sortOrder: 1 },
          { id: "cfg-lunch", name: "Lunch", sortOrder: 2 },
          { id: "cfg-dinner", name: "Dinner", sortOrder: 3 },
          { id: "cfg-supper", name: "Supper", sortOrder: 4 },
        ],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }));

    render(<MealPlanGrid />);

    const labels = screen.getByTestId("meal-type-row-labels");
    expect(
      labels.querySelectorAll("[data-testid^='meal-type-label-']"),
    ).toHaveLength(4);
    expect(screen.getByTestId("meal-type-label-supper")).toHaveTextContent("Supper");
    expect(screen.getAllByTestId("meal-slot-supper")).toHaveLength(7);
  });

  it("uses configured meal type names instead of hardcoded defaults", () => {
    mockUseSWR.mockImplementation(() => ({
      data: {
        ...buildWeekResponse("2026-05-10"),
        mealTypes: [
          { id: "cfg-breakfast", name: "Morning Meal", sortOrder: 1 },
          { id: "cfg-lunch", name: "Midday", sortOrder: 2 },
          { id: "cfg-dinner", name: "Main Meal", sortOrder: 3 },
        ],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }));

    render(<MealPlanGrid />);

    expect(screen.getByTestId("meal-type-label-morning meal")).toHaveTextContent(
      "Morning Meal",
    );
    expect(screen.getByTestId("meal-type-label-midday")).toHaveTextContent("Midday");
    expect(screen.getByTestId("meal-type-label-main meal")).toHaveTextContent(
      "Main Meal",
    );
    expect(screen.queryByTestId("meal-type-label-breakfast")).not.toBeInTheDocument();
  });

  it("fetches meal plan data keyed by week offset", () => {
    render(<MealPlanGrid />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/meal-plan?offset=0",
      expect.any(Function),
      expect.objectContaining({ refreshInterval: expect.any(Function) }),
    );
    expect(lastSwrOptions().refreshInterval(buildWeekResponse("2026-05-10"))).toBe(0);
  });

  function weekNav() {
    return within(screen.getByRole("navigation"));
  }

  it("changes week when navigating weeks", () => {
    render(<MealPlanGrid />);

    fireEvent.click(weekNav().getByRole("button", { name: /next week/i }));

    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=1",
      expect.any(Function),
      expect.any(Object),
    );

    fireEvent.click(weekNav().getByRole("button", { name: /this week/i }));

    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=0",
      expect.any(Function),
      expect.any(Object),
    );

    fireEvent.click(weekNav().getByRole("button", { name: /previous week/i }));

    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=-1",
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("disables previous week at the oldest allowed week", () => {
    render(<MealPlanGrid />);

    fireEvent.click(weekNav().getByRole("button", { name: /previous week/i }));
    expect(weekNav().getByRole("button", { name: /previous week/i })).toBeDisabled();
  });

  it("disables next week at the newest allowed week", () => {
    render(<MealPlanGrid />);

    fireEvent.click(weekNav().getByRole("button", { name: /next week/i }));

    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=1",
      expect.any(Function),
      expect.any(Object),
    );

    expect(weekNav().getByRole("button", { name: /next week/i })).toBeDisabled();
  });

  it("shows the weekly date range between chevrons in WeekNav", () => {
    render(<MealPlanGrid />);

    expect(weekNav().getByText("May 10 – May 16, 2026")).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /previous week/i })).toHaveLength(1);
    expect(screen.queryAllByRole("button", { name: /next week/i })).toHaveLength(1);
  });

  it("sets SWR refreshInterval to 3000 when any slot is PENDING", () => {
    mockUseSWR.mockImplementation((key: string) => {
      const offset = Number(key.split("offset=")[1] ?? "0");
      const weekStart =
        offset === -1 ? "2026-05-03" : offset === 1 ? "2026-05-17" : "2026-05-10";
      const data = buildWeekResponse(weekStart);
      data.days[0].slots = [
        {
          id: "slot-1",
          mealTypeConfigId: "cfg-lunch",
          mealTypeName: "Lunch",
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
        mealTypeConfigId: "cfg-lunch",
        mealTypeName: "LUNCH",
        mealName: "Soup",
        isToddlerAppropriate: true,
        ingredientsStatus: "PENDING",
        ingredients: [],
      },
    ];

    expect(lastSwrOptions().refreshInterval(pendingData)).toBe(3000);
  });
});
