"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/actions/auth";
import { Logo } from "./logo";
import { NAV_ITEMS, isActive } from "./nav-items";

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col px-5 py-7 lg:flex">
      <Link href="/dashboard" className="mb-10 flex items-center gap-2.5 px-2" aria-label="Wellness dashboard home">
        <Logo />
        <span className="text-[17px] font-bold tracking-tight text-ink">Wellness</span>
      </Link>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition",
                active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:bg-surface/60 hover:text-ink",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-accent-strong" : "")} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl bg-surface/70 p-3">
        <p className="truncate px-1 text-xs text-ink-3" title={email ?? undefined}>
          {email ?? "Signed in"}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-2 flex h-9 w-full items-center gap-2 rounded-xl px-2 text-sm font-semibold text-ink-2 transition hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
