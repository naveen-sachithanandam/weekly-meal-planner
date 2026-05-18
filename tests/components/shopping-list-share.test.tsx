import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShoppingListShareActions } from "../../components/shopping-list/shopping-list-share-actions";

describe("ShoppingListShareActions", () => {
  it("renders share controls when items exist", () => {
    render(
      <ShoppingListShareActions weekStart="2026-05-10" items={["Rice", "Dal"]} />,
    );

    expect(screen.getByRole("button", { name: /share list/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /send via whatsapp/i })).toHaveAttribute(
      "href",
      expect.stringContaining("wa.me"),
    );
  });

  it("renders nothing when list is empty", () => {
    const { container } = render(
      <ShoppingListShareActions weekStart="2026-05-10" items={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
