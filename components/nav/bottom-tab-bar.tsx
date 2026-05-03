"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/meal-plan", label: "Meals", icon: "🥘" },
  { href: "/shopping-list", label: "Shopping", icon: "🛒" },
] as const;

/** Fixed bottom navigation — two tabs, mobile-first, matches DESIGN.md shell. */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-tab-bar flex justify-center">
      <nav
        className="pointer-events-auto flex h-16 w-full max-w-[430px] items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(44,36,22,0.12)]"
        aria-label="Main navigation"
      >
        {tabs.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-brand" : "text-text-muted"
              }`}
            >
              <span className="relative flex flex-col items-center">
                {active ? (
                  <span
                    className="absolute -top-1.5 h-1.5 w-1.5 rounded-full bg-brand"
                    aria-hidden
                  />
                ) : null}
                <span className="text-xl leading-none" aria-hidden>
                  {icon}
                </span>
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
