/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppNav } from "../../components/layout/app-nav";

describe("AppNav", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a settings link to /settings (AC-007)", () => {
    render(<AppNav />);

    const settingsLink = screen.getByRole("link", { name: /settings/i });
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("renders a home link to the meal grid", () => {
    render(<AppNav />);

    const homeLink = screen.getByRole("link", { name: /weekly meal planner/i });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders a shopping list link to /shopping", () => {
    render(<AppNav />);

    expect(screen.getByRole("link", { name: /shopping list/i })).toHaveAttribute(
      "href",
      "/shopping",
    );
  });
});
