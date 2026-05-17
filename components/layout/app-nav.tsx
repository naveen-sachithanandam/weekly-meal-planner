import Link from "next/link";

export function AppNav() {
  return (
    <header className="nav-header">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3"
      >
        <Link
          href="/"
          className="text-lg font-semibold hover:text-[var(--color-accent)]"
        >
          Weekly Meal Planner
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/shopping" className="btn-neutral px-2 py-1 text-sm">
            Shopping list
          </Link>
          <Link
            href="/settings"
            className="btn-neutral flex items-center gap-1.5 px-2 py-1 text-sm"
          >
            <span aria-hidden="true">⚙</span>
            <span>Settings</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
