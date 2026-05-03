"use client";

import { useMemo, useState } from "react";

import type { MealPlanApiPayload } from "@/hooks/use-meal-plan";
import type { ShoppingListApiPayload } from "@/hooks/use-shopping-list";
import { sortGroupsForChecklistView } from "@/lib/shopping-checklist-sort";
import { MANUAL_MEAL_KEY, mealSlotLabelMap, orderedMealSlotIdsFromPlan } from "@/lib/shopping-meal-labels";
import { SHOPPING_SECTION_HEADING, SHOPPING_SECTION_ORDER } from "@/lib/shopping-section-labels";
import type { ShoppingLineGroupWithContributions } from "@/lib/shopping-utils";

export type ShoppingViewMode = "meal" | "section" | "checklist";

function quantitySummary(group: ShoppingLineGroupWithContributions): string {
  return group.contributions
    .map((c) => c.quantityText.trim())
    .filter((t) => t !== "")
    .join(" · ");
}

export interface ShoppingViewTabsProps {
  mode: ShoppingViewMode;
  onModeChange: (mode: ShoppingViewMode) => void;
}

export function ShoppingViewTabs({ mode, onModeChange }: ShoppingViewTabsProps) {
  const tabs: { id: ShoppingViewMode; label: string }[] = [
    { id: "meal", label: "📋 By meal" },
    { id: "section", label: "🏪 By section" },
    { id: "checklist", label: "✅ Checklist" },
  ];
  return (
    <div
      className="flex rounded-lg border border-border bg-surface-muted p-1 shadow-sm"
      role="tablist"
      aria-label="Shopping list view"
    >
      {tabs.map((t) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(t.id)}
            className={`min-h-10 flex-1 rounded-md px-2 text-center text-xs font-medium transition-colors ${
              active ? "bg-surface text-brand shadow-sm" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ShoppingMealViewProps {
  list: ShoppingListApiPayload;
  mealPlan: MealPlanApiPayload;
}

export function ShoppingMealView({ list, mealPlan }: ShoppingMealViewProps) {
  const mealLabels = useMemo(() => mealSlotLabelMap(mealPlan), [mealPlan]);
  const orderedIds = useMemo(() => orderedMealSlotIdsFromPlan(mealPlan), [mealPlan]);

  const sections = useMemo(() => {
    type Row = { group: ShoppingLineGroupWithContributions; contributionId: string; quantityText: string };
    const bucket = new Map<string, { label: string; rows: Row[] }>();

    for (const g of list.groups) {
      for (const c of g.contributions) {
        const key = c.mealSlotId ?? MANUAL_MEAL_KEY;
        const label =
          key === MANUAL_MEAL_KEY ? "Extras & manual adds" : (mealLabels.get(key) ?? "Meal");
        let block = bucket.get(key);
        if (!block) {
          block = { label, rows: [] };
          bucket.set(key, block);
        }
        block.rows.push({
          group: g,
          contributionId: c.id,
          quantityText: c.quantityText.trim(),
        });
      }
    }

    const keys: string[] = [];
    for (const id of orderedIds) {
      if (bucket.has(id)) keys.push(id);
    }
    if (bucket.has(MANUAL_MEAL_KEY)) keys.push(MANUAL_MEAL_KEY);

    return keys.map((k) => {
      const b = bucket.get(k);
      return b ? { key: k, label: b.label, rows: b.rows } : null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [list.groups, mealLabels, orderedIds]);

  if (sections.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center text-sm text-text-secondary">
        Nothing to show yet — add meals or tap + to add items.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((sec) => (
        <section key={sec.key} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">{sec.label}</h3>
          <ul className="flex flex-col gap-2">
            {sec.rows.map((row) => (
              <li
                key={`${row.group.id}-${row.contributionId}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm font-medium text-text-primary">{row.group.displayName}</span>
                {row.quantityText !== "" ? (
                  <span className="text-xs text-text-secondary">{row.quantityText}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export interface ShoppingSectionViewProps {
  groups: ShoppingLineGroupWithContributions[];
}

export function ShoppingSectionView({ groups }: ShoppingSectionViewProps) {
  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center text-sm text-text-secondary">
        Your list is empty 🛒
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {SHOPPING_SECTION_ORDER.map((section) => {
        const inSection = groups.filter((g) => g.section === section);
        if (inSection.length === 0) return null;
        return (
          <section key={section} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-text-primary">{SHOPPING_SECTION_HEADING[section]}</h3>
            <ul className="flex flex-col gap-2">
              {inSection.map((g) => (
                <li key={g.id} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-text-primary">{g.displayName}</span>
                  {quantitySummary(g) !== "" ? (
                    <span className="text-xs text-text-secondary">{quantitySummary(g)}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export interface ShoppingChecklistViewProps {
  groups: ShoppingLineGroupWithContributions[];
  onToggleChecked: (groupId: string, next: boolean) => void;
  onToggleAlreadyHave: (groupId: string, next: boolean) => void;
  onRemoveGroup: (group: ShoppingLineGroupWithContributions) => void;
}

export function ShoppingChecklistView({
  groups,
  onToggleChecked,
  onToggleAlreadyHave,
  onRemoveGroup,
}: ShoppingChecklistViewProps) {
  const sorted = useMemo(() => sortGroupsForChecklistView(groups), [groups]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (sorted.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted px-4 py-6 text-center text-sm text-text-secondary">
        Your list is empty 🛒
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((g) => {
        const qty = quantitySummary(g);
        const menuOpen = openMenuId === g.id;

        if (g.alreadyHave) {
          return (
            <div
              key={g.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface-muted px-3 py-3 shadow-sm"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none" aria-hidden>
                  🏠
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-muted line-through decoration-text-muted/60">{g.displayName}</p>
                  {qty !== "" ? <p className="text-xs text-text-muted">{qty}</p> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onToggleAlreadyHave(g.id, false)}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-brand hover:text-text-primary"
                >
                  Need to buy
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveGroup(g)}
                  className="rounded-md border border-border px-3 py-2 text-xs font-medium text-error transition-colors hover:bg-surface"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={g.id}
            className={`flex flex-col gap-2 rounded-lg border border-border bg-surface px-3 py-3 shadow-sm transition-opacity duration-200 ${
              g.checked ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <label className="flex min-h-12 flex-1 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={g.checked}
                  onChange={(e) => onToggleChecked(g.id, e.target.checked)}
                  className="mt-1 h-6 w-6 shrink-0 rounded border-border text-brand"
                  aria-label={`Bought ${g.displayName}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium text-text-primary ${g.checked ? "line-through" : ""}`}>
                    {g.displayName}
                  </span>
                  {qty !== "" ? <span className="mt-0.5 block text-xs text-text-secondary">{qty}</span> : null}
                </span>
              </label>
              <div className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  onClick={() => setOpenMenuId(menuOpen ? null : g.id)}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text-primary"
                >
                  ⋯
                </button>
                {menuOpen ? (
                  <div
                    className="absolute right-0 top-full z-[20] mt-1 min-w-[10rem] rounded-md border border-border bg-surface py-1 shadow-md"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-muted"
                      onClick={() => {
                        onToggleAlreadyHave(g.id, true);
                        setOpenMenuId(null);
                      }}
                    >
                      Already have at home
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="block w-full px-3 py-2 text-left text-xs text-error hover:bg-surface-muted"
                      onClick={() => {
                        onRemoveGroup(g);
                        setOpenMenuId(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
