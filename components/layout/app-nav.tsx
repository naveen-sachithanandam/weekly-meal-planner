import Link from "next/link";

export function AppNav() {
  return (
    <header className="nav-header">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-3"
      >
        <Link
          href="/"
          className="min-w-0 shrink text-base font-semibold hover:text-[var(--color-accent)] sm:text-lg"
        >
          <span className="sm:hidden">Meal Planner</span>
          <span className="hidden sm:inline">Weekly Meal Planner</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/shopping"
            className="btn-neutral btn-touch px-2.5 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm"
          >
            <span className="sm:hidden">Shop</span>
            <span className="hidden sm:inline">Shopping list</span>
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="btn-neutral btn-touch flex items-center gap-1.5 px-2.5 py-2 text-xs sm:px-2 sm:py-1 sm:text-sm"
          >
            <span aria-hidden="true">⚙</span>
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
