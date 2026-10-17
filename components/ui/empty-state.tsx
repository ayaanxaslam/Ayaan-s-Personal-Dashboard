import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl bg-surface-2/60 text-center",
        compact ? "gap-1.5 px-4 py-5" : "gap-2 px-6 py-10",
        className,
      )}
    >
      {icon ? (
        <span className="mb-1 grid size-10 place-items-center rounded-2xl bg-surface text-ink-3 shadow-card" aria-hidden>
          {icon}
        </span>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-relaxed text-ink-3">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
