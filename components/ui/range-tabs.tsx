import Link from "next/link";
import { cn } from "@/lib/cn";

/** Segmented control that switches a `?range=` search param. */
export function RangeTabs({
  basePath,
  options,
  value,
  label,
}: {
  basePath: string;
  options: Array<{ value: number; label: string }>;
  value: number;
  label: string;
}) {
  return (
    <nav aria-label={label} className="inline-flex rounded-2xl bg-surface p-1 shadow-card">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Link
            key={o.value}
            href={`${basePath}?range=${o.value}`}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
              active ? "bg-ink text-surface" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
