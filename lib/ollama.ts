import {
  CUISINE_CONTEXT,
  OLLAMA_HOST,
  OLLAMA_HOUSEHOLD_PROMPT,
  OLLAMA_MODEL,
} from "./config";
import { prisma } from "./prisma";

export function buildIngredientPrompt(mealName: string): string {
  const cuisineClause = CUISINE_CONTEXT
    ? `, a dish from ${CUISINE_CONTEXT} cuisine`
    : "";
  const householdClause = OLLAMA_HOUSEHOLD_PROMPT
    ? ` ${OLLAMA_HOUSEHOLD_PROMPT}`
    : "";
  return `List the ingredients needed to make "${mealName}"${cuisineClause}.${householdClause} Return only a simple comma-separated list of ingredients, nothing else.`;
}

export async function isOllamaReachable(): Promise<boolean> {
  try {
    const response = await fetch(OLLAMA_HOST, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function generateIngredients(
  slotId: string,
  mealName: string,
): Promise<void> {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildIngredientPrompt(mealName),
        stream: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = (await response.json()) as { response: string };
    const names = data.response
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

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
  } catch {
    await prisma.mealSlot.update({
      where: { id: slotId },
      data: { ingredientsStatus: "FAILED" },
    });
  }
}
