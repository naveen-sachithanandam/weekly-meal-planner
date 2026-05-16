import { MealPlanGrid } from "../components/meal-plan-grid/meal-plan-grid";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Weekly Meal Planner</h1>
      <MealPlanGrid />
    </main>
  );
}
