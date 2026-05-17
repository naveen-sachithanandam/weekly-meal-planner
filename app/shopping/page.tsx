import { ShoppingListView } from "../../components/shopping-list/shopping-list-view";

export default function ShoppingPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold">Shopping list</h1>
      <p className="no-print mb-4 text-sm text-muted">
        Approved ingredients from your meal plan for the selected week.
      </p>
      <ShoppingListView />
    </main>
  );
}
