/** @vitest-environment jsdom */

/**
 * Feature 001 sign-off tracer bullet — AC-001 through AC-008 (GitHub #29, #30).
 * Complements unit tests in meal-plan-grid.test.tsx, day-column.test.tsx,
 * meal-slot-*.test.tsx, and api/meal-slots*.test.ts.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DayColumn } from "../../components/meal-plan-grid/day-column";
import { MealPlanGrid } from "../../components/meal-plan-grid/meal-plan-grid";
import { MealSlotCell } from "../../components/meal-plan-grid/meal-slot-cell/meal-slot-cell";
import type { MealPlanDay, MealPlanResponse, MealPlanSlot } from "../../lib/types";
import { DEFAULT_MEAL_TYPES, buildSlot, mealTypeByName } from "../helpers/meal-plan-fixtures";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

function buildDay(overrides: Partial<MealPlanDay> = {}): MealPlanDay {
  return {
    date: "2026-05-15",
    isToddlerHome: false,
    isPast: false,
    slots: [],
    ...overrides,
  };
}

function SlotSaveHarness() {
  const [slot, setSlot] = useState<MealPlanSlot | null>(null);

  return (
    <MealSlotCell
      slot={slot}
      mealType={mealTypeByName("Lunch")}
      date="2026-05-15"
      isPast={false}
      onMutate={async () => {
        setSlot(
          buildSlot({
            id: "slot-new",
            mealName: "Dal rice",
            ingredientsStatus: "PENDING",
            ingredients: [],
          }),
        );
      }}
    />
  );
}

function SlotRenameHarness() {
  const [slot, setSlot] = useState<MealPlanSlot>(
    buildSlot({
      id: "slot-1",
      mealName: "Dal rice",
      ingredientsStatus: "READY",
      ingredients: [{ id: "ing-1", name: "Toor dal", approved: false }],
    }),
  );

  return (
    <MealSlotCell
      slot={slot}
      mealType={mealTypeByName("Lunch")}
      date="2026-05-15"
      isPast={false}
      onMutate={async () => {
        setSlot(
          buildSlot({
            id: "slot-1",
            mealName: "Prawn masala",
            ingredientsStatus: "PENDING",
            ingredients: [],
          }),
        );
      }}
    />
  );
}

function buildWeekResponse(
  weekStart: string,
  options: { mealName?: string; isPast?: boolean } = {},
): MealPlanResponse {
  const days = Array.from({ length: 7 }, (_, index) => {
    const dayNum = Number(weekStart.slice(-2)) + index;
    const date = `2026-05-${String(dayNum).padStart(2, "0")}`;
    const slots =
      options.mealName && index === 0
        ? [
            buildSlot({
              mealTypeConfigId: "cfg-lunch",
              mealTypeName: "Lunch",
              mealName: options.mealName,
              ingredientsStatus: "READY",
              ingredients: [{ id: "ing-1", name: "Rice", approved: false }],
            }),
          ]
        : [];

    return {
      date,
      isToddlerHome: false,
      isPast: options.isPast ?? false,
      slots,
    };
  });

  return {
    weekStart,
    mealTypes: DEFAULT_MEAL_TYPES,
    days,
  };
}

describe("Feature 001 sign-off — AC-001 slot saves immediately on confirm", () => {
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

  it("asks toddler-appropriate in the confirmation form", () => {
    render(
      <MealSlotCell
        slot={null}
        mealType={mealTypeByName("Lunch")}
        date="2026-05-15"
        isPast={false}
        onMutate={onMutate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add meal/i }));

    expect(screen.getByRole("checkbox", { name: /toddler-appropriate/i })).toBeInTheDocument();
  });

  it("shows meal name and ingredient loading after confirm without waiting for Ollama", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "slot-new" }), { status: 201 }),
    );

    render(<SlotSaveHarness />);

    fireEvent.click(screen.getByRole("button", { name: /add meal/i }));
    fireEvent.change(screen.getByLabelText(/meal name/i), {
      target: { value: "Dal rice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Dal rice" })).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Generating ingredients…");
    expect(screen.queryByLabelText(/meal name/i)).not.toBeInTheDocument();
  });
});

describe("Feature 001 sign-off — AC-002 ingredients populate asynchronously", () => {
  const onMutate = vi.fn();

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("allows other slots to stay interactive while one slot is PENDING", () => {
    const day = buildDay({
      slots: [
        buildSlot({
          mealTypeConfigId: "cfg-breakfast",
          mealTypeName: "Breakfast",
          mealName: "Idli",
          ingredientsStatus: "PENDING",
          ingredients: [],
        }),
        buildSlot({
          id: "slot-lunch",
          mealTypeConfigId: "cfg-lunch",
          mealTypeName: "Lunch",
          mealName: "Sambar rice",
          ingredientsStatus: "READY",
          ingredients: [{ id: "ing-1", name: "Toor dal", approved: false }],
        }),
      ],
    });

    render(
      <DayColumn day={day} mealTypes={DEFAULT_MEAL_TYPES} onMutate={onMutate} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Generating ingredients…");
    expect(screen.getByRole("button", { name: "Sambar rice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add meal/i })).toBeInTheDocument();
  });

  it("shows ingredient list when status is READY", () => {
    render(
      <MealSlotCell
        slot={buildSlot({
          ingredientsStatus: "READY",
          ingredients: [
            { id: "ing-1", name: "Toor dal", approved: false },
            { id: "ing-2", name: "Rice", approved: false },
          ],
        })}
        mealType={mealTypeByName("Lunch")}
        date="2026-05-15"
        isPast={false}
      />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /approve toor dal/i })).toBeInTheDocument();
  });
});

describe("Feature 001 sign-off — AC-003 Ollama unavailable graceful degradation", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows unavailable message and manual add for EMPTY ingredients", () => {
    render(
      <MealSlotCell
        slot={buildSlot({ ingredientsStatus: "EMPTY", ingredients: [] })}
        mealType={mealTypeByName("Lunch")}
        date="2026-05-15"
        isPast={false}
      />,
    );

    expect(screen.getByText("Ingredients unavailable. Add manually.")).toBeInTheDocument();
    expect(screen.getByLabelText(/add ingredient/i)).toBeInTheDocument();
  });

  it("shows unavailable message and manual add for FAILED ingredients", () => {
    render(
      <MealSlotCell
        slot={buildSlot({ ingredientsStatus: "FAILED", ingredients: [] })}
        mealType={mealTypeByName("Lunch")}
        date="2026-05-15"
        isPast={false}
      />,
    );

    expect(screen.getByText("Ingredients unavailable. Add manually.")).toBeInTheDocument();
    expect(screen.getByLabelText(/add ingredient/i)).toBeInTheDocument();
  });
});

describe("Feature 001 sign-off — AC-004 past days are read-only", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders filled past slots as plain text without edit or delete controls", () => {
    render(
      <MealSlotCell
        slot={buildSlot({
          ingredientsStatus: "READY",
          ingredients: [{ id: "ing-1", name: "Rice", approved: true }],
        })}
        mealType={mealTypeByName("Lunch")}
        date="2026-05-10"
        isPast
      />,
    );

    expect(screen.getByText("Sambar rice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit meal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete meal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add meal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("renders empty past slots as em dash without add control", () => {
    render(
      <MealSlotCell
        slot={null}
        mealType={mealTypeByName("Breakfast")}
        date="2026-05-10"
        isPast
      />,
    );

    expect(screen.getByTestId("meal-slot-breakfast")).toHaveTextContent("—");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Feature 001 sign-off — AC-005 week navigation", () => {
  const weekData = new Map<number, MealPlanResponse>([
    [-1, buildWeekResponse("2026-05-03", { mealName: "Last week soup" })],
    [0, buildWeekResponse("2026-05-10", { mealName: "Current week dal" })],
    [1, buildWeekResponse("2026-05-17")],
  ]);

  beforeEach(() => {
    mockUseSWR.mockImplementation((key: string) => {
      const offset = Number(key.split("offset=")[1] ?? "0");
      return {
        data: weekData.get(offset) ?? buildWeekResponse("2026-05-10"),
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

  function weekNav() {
    return within(screen.getByRole("navigation"));
  }

  it("navigates prev, current, and next week with updated date range label", () => {
    render(<MealPlanGrid />);

    expect(weekNav().getByText("May 10 – May 16, 2026")).toBeInTheDocument();

    fireEvent.click(weekNav().getByRole("button", { name: /next week/i }));
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=1",
      expect.any(Function),
      expect.any(Object),
    );
    expect(weekNav().getByText("May 17 – May 23, 2026")).toBeInTheDocument();

    fireEvent.click(weekNav().getByRole("button", { name: /this week/i }));
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=0",
      expect.any(Function),
      expect.any(Object),
    );
    expect(weekNav().getByText("May 10 – May 16, 2026")).toBeInTheDocument();

    fireEvent.click(weekNav().getByRole("button", { name: /previous week/i }));
    expect(mockUseSWR).toHaveBeenLastCalledWith(
      "/api/meal-plan?offset=-1",
      expect.any(Function),
      expect.any(Object),
    );
    expect(weekNav().getByText("May 3 – May 9, 2026")).toBeInTheDocument();
  });

  it("retains each week's saved state when navigating back", () => {
    render(<MealPlanGrid />);

    expect(screen.getByRole("button", { name: "Current week dal" })).toBeInTheDocument();

    fireEvent.click(weekNav().getByRole("button", { name: /previous week/i }));
    expect(screen.getByRole("button", { name: "Last week soup" })).toBeInTheDocument();

    fireEvent.click(weekNav().getByRole("button", { name: /this week/i }));
    expect(screen.getByRole("button", { name: "Current week dal" })).toBeInTheDocument();
  });

  it("disables chevrons at previous and next week boundaries", () => {
    render(<MealPlanGrid />);

    fireEvent.click(weekNav().getByRole("button", { name: /previous week/i }));
    expect(weekNav().getByRole("button", { name: /previous week/i })).toBeDisabled();

    fireEvent.click(weekNav().getByRole("button", { name: /this week/i }));
    fireEvent.click(weekNav().getByRole("button", { name: /next week/i }));
    expect(weekNav().getByRole("button", { name: /next week/i })).toBeDisabled();
  });
});

describe("Feature 001 sign-off — AC-006 toddler home day conflicts", () => {
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

  it("prompts to review conflicts and force-saves when confirmed", async () => {
    const fetchMock = vi.mocked(fetch);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmMock);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          override: { date: "2026-05-15", isHome: true },
          conflicts: [{ slotId: "slot-1", mealType: "Lunch", mealName: "Misal pav" }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          override: { date: "2026-05-15", isHome: true },
          conflicts: [],
        }),
      } as Response);

    render(
      <DayColumn
        day={buildDay({ date: "2026-05-15" })}
        mealTypes={DEFAULT_MEAL_TYPES}
        onMutate={onMutate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /mark toddler home/i }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledWith(
        expect.stringContaining("Misal pav"),
      );
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith("/api/toddler-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-05-15", isHome: true, force: true }),
      });
    });
    expect(onMutate).toHaveBeenCalled();
  });

  it("does not save when the conflict review prompt is cancelled", async () => {
    const fetchMock = vi.mocked(fetch);
    const confirmMock = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmMock);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        override: { date: "2026-05-15", isHome: true },
        conflicts: [{ slotId: "slot-1", mealType: "Lunch", mealName: "Misal pav" }],
      }),
    } as Response);

    render(
      <DayColumn
        day={buildDay({ date: "2026-05-15" })}
        mealTypes={DEFAULT_MEAL_TYPES}
        onMutate={onMutate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /mark toddler home/i }));

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalled();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onMutate).not.toHaveBeenCalled();
  });
});

describe("Feature 001 sign-off — AC-007 Sunday is first column", () => {
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

  it("renders Sunday as the first day column for current, previous, and next week", () => {
    render(<MealPlanGrid />);

    const headers = screen.getAllByTestId("day-header");
    expect(headers[0]).toHaveTextContent("Sunday");
    expect(headers[6]).toHaveTextContent("Saturday");

    fireEvent.click(screen.getByRole("button", { name: /previous week/i }));
    expect(screen.getAllByTestId("day-header")[0]).toHaveTextContent("Sunday");
    expect(screen.getByText("May 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /this week/i }));
    fireEvent.click(screen.getByRole("button", { name: /next week/i }));
    expect(screen.getAllByTestId("day-header")[0]).toHaveTextContent("Sunday");
    expect(screen.getByText("May 17")).toBeInTheDocument();
  });
});

describe("Feature 001 sign-off — AC-008 meal rename re-runs Ollama", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("PATCHes a new meal name and shows ingredient loading after confirm", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "slot-1",
          mealName: "Prawn masala",
          ingredientsStatus: "PENDING",
          ingredients: [],
        }),
        { status: 200 },
      ),
    );

    render(<SlotRenameHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Edit meal" }));
    fireEvent.change(screen.getByLabelText(/meal name/i), {
      target: { value: "Prawn masala" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/meal-slots/slot-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealName: "Prawn masala",
          isToddlerAppropriate: true,
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Prawn masala" })).toBeInTheDocument();
    });

    expect(screen.getByRole("status")).toHaveTextContent("Generating ingredients…");
    expect(screen.queryByRole("checkbox", { name: /approve toor dal/i })).not.toBeInTheDocument();
  });
});
