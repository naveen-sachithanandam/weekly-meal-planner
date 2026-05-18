import { MealPlanGrid } from "../components/meal-plan-grid/meal-plan-grid";

export default function HomePage() {
  return (
    <main className="page-shell max-w-7xl">
      <h1 className="page-title">Weekly Meal Planner</h1>
      <MealPlanGrid />
    </main>
  );
}
