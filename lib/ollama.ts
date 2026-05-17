import { after } from "next/server";

import {
  CUISINE_CONTEXT,
  OLLAMA_HOST,
  OLLAMA_HOUSEHOLD_PROMPT,
  OLLAMA_MODEL,
} from "./config";
import { prisma } from "./prisma";

/** Per plan §4 — ingredient generation must not block saves indefinitely. */
export const OLLAMA_GENERATE_TIMEOUT_MS = 10_000;
export const OLLAMA_TAGS_TIMEOUT_MS = 3_000;

type OllamaTagsResponse = {
  models?: Array<{ name: string; model?: string }>;
};

export function buildIngredientPrompt(mealName: string): string {
  const cuisineClause = CUISINE_CONTEXT
    ? `, a dish from ${CUISINE_CONTEXT} cuisine`
    : "";
  const householdClause = OLLAMA_HOUSEHOLD_PROMPT
    ? ` ${OLLAMA_HOUSEHOLD_PROMPT}`
    : "";
  return `List the ingredients needed to make "${mealName}"${cuisineClause}.${householdClause} Return only a simple comma-separated list of ingredients, nothing else.`;
}

/** Normalize "llama3.1:latest" → "llama3.1" for prefix matching. */
function modelBaseName(name: string): string {
  return name.split(":")[0]?.toLowerCase() ?? name.toLowerCase();
}

/**
 * Pick an installed Ollama model matching OLLAMA_MODEL.
 * Supports exact names (llama3.1:latest) and prefixes (llama3 → llama3.1:latest).
 */
export function resolveOllamaModelName(
  requested: string,
  available: string[],
): string | null {
  const wanted = requested.trim().toLowerCase();
  if (!wanted) {
    return null;
  }

  const normalized = available.map((name) => ({
    full: name,
    base: modelBaseName(name),
  }));

  const exact = normalized.find(
    (entry) =>
      entry.full.toLowerCase() === wanted ||
      entry.base === wanted ||
      entry.base === modelBaseName(wanted),
  );
  if (exact) {
    return exact.full;
  }

  const prefix = normalized.find(
    (entry) =>
      entry.base.startsWith(wanted) || wanted.startsWith(entry.base),
  );
  return prefix?.full ?? null;
}

export async function fetchOllamaModelNames(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(OLLAMA_TAGS_TIMEOUT_MS),
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as OllamaTagsResponse;
    return (data.models ?? []).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function getResolvedOllamaModel(): Promise<string | null> {
  const names = await fetchOllamaModelNames();
  return resolveOllamaModelName(OLLAMA_MODEL, names);
}

/** True when Ollama responds on /api/tags and an installed model matches OLLAMA_MODEL. */
export async function isOllamaReachable(): Promise<boolean> {
  return (await getResolvedOllamaModel()) !== null;
}

/**
 * Run ingredient generation after the HTTP response (Next.js `after()`).
 * Vitest calls the task directly because route handlers are invoked without a request scope.
 */
export function scheduleIngredientGeneration(
  slotId: string,
  mealName: string,
): void {
  const task = () => generateIngredients(slotId, mealName);
  if (process.env.VITEST) {
    void task();
    return;
  }
  after(task);
}

function parseIngredientNames(responseText: string): string[] {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return [];
  }

  // Prefer comma-separated (per prompt). Fall back to first line only if multiline prose.
  const primary = trimmed.includes("\n") ? trimmed.split("\n")[0]! : trimmed;
  return primary
    .split(",")
    .map((s) => s.replace(/^[\d.)\-*•]+\s*/, "").trim())
    .filter(Boolean);
}

export async function generateIngredients(
  slotId: string,
  mealName: string,
): Promise<void> {
  try {
    const model = await getResolvedOllamaModel();
    if (!model) {
      console.error(
        `[ollama] No model matching OLLAMA_MODEL="${OLLAMA_MODEL}". ` +
          `Run \`ollama list\` and set OLLAMA_MODEL to an installed name.`,
      );
      await prisma.mealSlot.update({
        where: { id: slotId },
        data: { ingredientsStatus: "FAILED" },
      });
      return;
    }

    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildIngredientPrompt(mealName),
        stream: false,
      }),
      signal: AbortSignal.timeout(OLLAMA_GENERATE_TIMEOUT_MS),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(
        `[ollama] /api/generate failed (${response.status}) model=${model}: ${detail}`,
      );
      await prisma.mealSlot.update({
        where: { id: slotId },
        data: { ingredientsStatus: "FAILED" },
      });
      return;
    }

    const data = (await response.json()) as { response?: string };
    const names = parseIngredientNames(data.response ?? "");

    if (names.length === 0) {
      console.error("[ollama] Empty ingredient list in response");
      await prisma.mealSlot.update({
        where: { id: slotId },
        data: { ingredientsStatus: "FAILED" },
      });
      return;
    }

    await prisma.mealSlot.update({
      where: { id: slotId },
      data: {
        ingredientsStatus: "READY",
        ingredients: {
          deleteMany: {},
          create: names.map((name) => ({ name, approved: false })),
        },
      },
    });
  } catch (error) {
    console.error("[ollama] generateIngredients error:", error);
    await prisma.mealSlot.update({
      where: { id: slotId },
      data: { ingredientsStatus: "FAILED" },
    });
  }
}
