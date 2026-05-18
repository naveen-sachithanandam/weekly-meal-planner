import { ShoppingListView } from "../../components/shopping-list/shopping-list-view";

export default function ShoppingPage() {
  return (
    <main className="page-shell-narrow">
      <h1 className="page-title">Shopping list</h1>
      <p className="no-print mb-4 text-sm text-muted">
        Approved ingredients from your meal plan for the selected week.
      </p>
      <ShoppingListView />
    </main>
  );
}
