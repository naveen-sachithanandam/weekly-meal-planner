import { vi } from "vitest";

export function mealSlotExpandProps(isExpanded = false) {
  return {
    isExpanded,
    onToggleExpand: vi.fn(),
  };
}

export function dayColumnExpandProps(expandedSlotId: string | null = null) {
  return {
    expandedSlotId,
    onToggleExpand: vi.fn(),
  };
}
