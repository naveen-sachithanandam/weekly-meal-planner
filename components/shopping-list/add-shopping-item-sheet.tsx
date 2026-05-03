"use client";

import { StoreSection } from "@prisma/client";
import { useCallback, useEffect, useId, useState } from "react";

import {
  SHOPPING_SECTION_ORDER,
  SHOPPING_SECTION_SHORT_LABEL,
} from "@/lib/shopping-section-labels";

export interface AddShoppingItemSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { displayName: string; quantityText: string; section: StoreSection }) => void;
}

/**
 * Bottom sheet to add a manual shopping line (DESIGN.md — few fields, full-width save).
 */
export function AddShoppingItemSheet({ isOpen, onClose, onSave }: AddShoppingItemSheetProps) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [section, setSection] = useState<StoreSection>(StoreSection.PRODUCE);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setQty("");
    setSection(StoreSection.PRODUCE);
  }, [isOpen]);

  const handleSave = useCallback(() => {
    const displayName = name.trim();
    const quantityText = qty.trim();
    if (displayName === "" || quantityText === "") return;
    onSave({ displayName, quantityText, section });
    onClose();
  }, [name, qty, section, onClose, onSave]);

  const canSave = name.trim() !== "" && qty.trim() !== "";

  return (
    <div
      className={`fixed inset-0 z-[44] flex justify-center bg-[rgba(44,36,22,0.35)] transition-opacity duration-200 ease-out ${
        isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`mt-auto flex max-h-[90vh] w-full max-w-[430px] flex-col rounded-t-xl border border-border bg-surface shadow-[0_-8px_24px_rgba(44,36,22,0.12)] transition-transform duration-200 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), var(--space-4))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col px-4 pb-4 pt-2">
          <div className="mb-3 flex flex-col items-center gap-2">
            <div className="h-1.5 w-10 shrink-0 rounded-full bg-border" aria-hidden />
            <h2 id={titleId} className="text-center text-base font-semibold text-text-primary">
              Add item
            </h2>
          </div>

          <div className="flex max-h-[min(60vh,24rem)] flex-col gap-4 overflow-y-auto">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Item name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
                autoComplete="off"
                placeholder="e.g. Basmati rice"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Quantity</span>
              <input
                type="text"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
                autoComplete="off"
                placeholder="e.g. 2 kg"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-text-secondary">Section</span>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as StoreSection)}
                className="min-h-12 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm"
              >
                {SHOPPING_SECTION_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {SHOPPING_SECTION_SHORT_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="mt-4 min-h-12 w-full rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to list
          </button>
        </div>
      </div>
    </div>
  );
}
