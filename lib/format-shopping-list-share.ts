/** Plain-text body for clipboard, Web Share, or WhatsApp. */
export function formatShoppingListShareText(
  weekStart: string,
  items: string[],
): string {
  if (items.length === 0) {
    return `Shopping list (week of ${weekStart})\n\n(no items)`;
  }
  const lines = items.map((item) => `• ${item}`);
  return `Shopping list (week of ${weekStart})\n\n${lines.join("\n")}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
