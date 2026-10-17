"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/activity", label: "Overview" },
  { href: "/activity/sleep", label: "Sleep" },
  { href: "/activity/steps", label: "Steps" },
  { href: "/activity/water", label: "Water" },
  { href: "/activity/workouts", label: "Workouts" },
  { href: "/activity/meditation", label: "Meditation" },
  { href: "/activity/food", label: "Food" },
];

export function ActivityTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Activity sections" className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-2xl bg-surface p-1 shadow-card">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition",
                  active ? "bg-ink text-surface" : "text-ink-3 hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
