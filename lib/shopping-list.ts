/** Deduplicate ingredient names case-insensitively; preserve first-seen casing; sort A–Z. */
export function dedupeIngredientNames(names: string[]): string[] {
  const seen = new Map<string, string>();

  for (const raw of names) {
    const trimmed = raw.trim();
    const key = trimmed.toLowerCase();
    if (!key) {
      continue;
    }
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  }

  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}
