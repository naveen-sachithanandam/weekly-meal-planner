import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";

async function capture(page, name, options = {}) {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, ...options });
  console.log(`Wrote ${path}`);
}

async function seedDemoMeals() {
  const plan = await fetch(`${BASE}/api/meal-plan?offset=0`).then((response) =>
    response.json(),
  );
  const today = plan.days.find((day) => !day.isPast);
  if (!today) {
    return;
  }

  const lunch = plan.mealTypes.find((mealType) => mealType.name === "Lunch");
  const dinner = plan.mealTypes.find((mealType) => mealType.name === "Dinner");
  if (!lunch || !dinner) {
    return;
  }

  async function upsertMeal(mealTypeConfigId, mealName, ingredients) {
    const existing = today.slots.find(
      (slot) => slot.mealTypeConfigId === mealTypeConfigId,
    );
    let slotId = existing?.id;

    if (!slotId) {
      const created = await fetch(`${BASE}/api/meal-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today.date,
          mealTypeConfigId,
          mealName,
          isToddlerAppropriate: true,
        }),
      });
      if (!created.ok) {
        return;
      }
      const slot = await created.json();
      slotId = slot.id;
    }

    await fetch(`${BASE}/api/meal-slots/${slotId}/ingredients`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });
  }

  await upsertMeal(lunch.id, "Vegetable soup", [
    { name: "carrots", approved: true },
    { name: "celery", approved: true },
    { name: "onion", approved: false },
  ]);
  await upsertMeal(dinner.id, "Pasta with vegetables", [
    { name: "pasta", approved: true },
    { name: "tomatoes", approved: true },
    { name: "basil", approved: true },
  ]);
}

await mkdir(OUT, { recursive: true });
await seedDemoMeals();

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.getByText("+ Add meal").first().waitFor({ state: "visible", timeout: 15_000 });
await page.waitForTimeout(500);
await capture(page, "01-meal-plan-grid");

const expandButton = page
  .getByRole("button", { name: /vegetable soup, expand ingredients/i })
  .first();
if (await expandButton.isVisible().catch(() => false)) {
  await expandButton.click();
  await page.waitForTimeout(300);
  await capture(page, "02-meal-slot-expanded");
}

await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 10_000 });
await page.waitForTimeout(300);
await capture(page, "03-settings");

await page.goto(`${BASE}/shopping`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "Shopping list" }).waitFor({ timeout: 10_000 });
await page.waitForTimeout(500);
await capture(page, "04-shopping-list");

await browser.close();
