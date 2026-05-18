import {
  buildWhatsAppShareUrl,
  formatShoppingListShareText,
} from "./format-shopping-list-share";

export type ShareShoppingListResult =
  | { method: "share" }
  | { method: "copy" }
  | { method: "whatsapp" };

export async function shareShoppingList(
  weekStart: string,
  items: string[],
): Promise<ShareShoppingListResult> {
  const text = formatShoppingListShareText(weekStart, items);
  const title = "Shopping list";

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    const payload = { title, text };
    const canShare =
      typeof navigator.canShare !== "function" || navigator.canShare(payload);

    if (canShare) {
      try {
        await navigator.share(payload);
        return { method: "share" };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return { method: "copy" };
  }

  return { method: "whatsapp" };
}

export { buildWhatsAppShareUrl, formatShoppingListShareText };
