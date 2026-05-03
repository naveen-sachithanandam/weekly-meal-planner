import { redirect } from "next/navigation";

/** Home route sends people straight into the meal plan shell per product flow. */
export default function HomePage() {
  redirect("/meal-plan");
}
