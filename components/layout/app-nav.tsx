import Link from "next/link";

export function AppNav() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3"
      >
        <Link
          href="/"
          className="text-lg font-semibold text-gray-900 hover:text-gray-700"
        >
          Weekly Meal Planner
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
        >
          <span aria-hidden="true">⚙</span>
          <span>Settings</span>
        </Link>
      </nav>
    </header>
  );
}
