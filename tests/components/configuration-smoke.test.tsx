/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AddMealTypeForm } from "../../components/configuration/add-meal-type-form";
import { ConfigurationPage } from "../../components/configuration/configuration-page";
import { MealTypeRow } from "../../components/configuration/meal-type-row";
import type { MealTypeConfig } from "../../lib/types";

const mockUseSWR = vi.fn();
const mockMutate = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

const mealTypes: MealTypeConfig[] = [
  { id: "cfg-1", name: "Breakfast", sortOrder: 1, isActive: true },
  { id: "cfg-2", name: "Lunch", sortOrder: 2, isActive: true },
  { id: "cfg-3", name: "Dinner", sortOrder: 3, isActive: false },
];

describe("ConfigurationPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lists meal types with name and position (AC-001)", () => {
    mockUseSWR.mockReturnValue({
      data: { mealTypes },
      error: undefined,
      isLoading: false,
      mutate: mockMutate,
    });

    render(<ConfigurationPage />);

    expect(screen.getByRole("heading", { level: 1, name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Position 1")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Position 2")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Position 3")).toBeInTheDocument();
  });
});

describe("AddMealTypeForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows an inline error when the name duplicates an existing meal type (AC-006)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "A meal type with this name already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );

    const onAdded = vi.fn();
    render(<AddMealTypeForm onAdded={onAdded} />);

    fireEvent.change(screen.getByLabelText(/new meal type/i), {
      target: { value: "Breakfast" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "A meal type with this name already exists",
      );
    });
    expect(onAdded).not.toHaveBeenCalled();
  });

  it("clears the input and calls onAdded after a successful add (AC-002)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cfg-4",
          name: "Evening Snack",
          sortOrder: 4,
          isActive: true,
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );

    const onAdded = vi.fn();
    render(<AddMealTypeForm onAdded={onAdded} />);

    const input = screen.getByLabelText(/new meal type/i);
    fireEvent.change(input, { target: { value: "Evening Snack" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalled();
    });
    expect(input).toHaveValue("");
  });
});

describe("MealTypeRow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows reactivation for inactive meal types (AC-005)", () => {
    render(
      <ul>
        <MealTypeRow
          mealType={mealTypes[2]}
          isLastActive={false}
          onUpdated={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^activate$/i })).toBeInTheDocument();
  });

  it("disables deactivate when this is the last active meal type", () => {
    render(
      <ul>
        <MealTypeRow
          mealType={mealTypes[0]}
          isLastActive
          onUpdated={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByRole("button", { name: /^deactivate$/i })).toBeDisabled();
  });

  it("shows an inline error on duplicate rename (AC-006)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "A meal type with this name already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(
      <ul>
        <MealTypeRow
          mealType={mealTypes[0]}
          isLastActive={false}
          onUpdated={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^breakfast$/i }));
    fireEvent.change(screen.getByLabelText(/meal type name/i), {
      target: { value: "Lunch" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "A meal type with this name already exists",
      );
    });
  });
});
