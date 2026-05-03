import { StoreSection } from "@prisma/client";

/** Section headings for shopping views (SPEC.md store order + emoji). */
export const SHOPPING_SECTION_HEADING: Record<StoreSection, string> = {
  [StoreSection.PRODUCE]: "🥦 Produce",
  [StoreSection.DAIRY_AND_EGGS]: "🥛 Dairy & Eggs",
  [StoreSection.DRY_GOODS_AND_GRAINS]: "🌾 Dry Goods & Grains",
  [StoreSection.PANTRY_AND_SPICES]: "🫙 Pantry & Spices",
  [StoreSection.FROZEN]: "🧊 Frozen",
};

/** Short labels for pickers and compact UI. */
export const SHOPPING_SECTION_SHORT_LABEL: Record<StoreSection, string> = {
  [StoreSection.PRODUCE]: "Produce",
  [StoreSection.DAIRY_AND_EGGS]: "Dairy & Eggs",
  [StoreSection.DRY_GOODS_AND_GRAINS]: "Dry Goods & Grains",
  [StoreSection.PANTRY_AND_SPICES]: "Pantry & Spices",
  [StoreSection.FROZEN]: "Frozen",
};

export { SHOPPING_SECTION_ORDER } from "@/lib/shopping-utils";
