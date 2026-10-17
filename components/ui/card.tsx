import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-3xl bg-surface p-5 shadow-card sm:p-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  icon,
  action,
  subtitle,
  id,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  subtitle?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden>
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {subtitle ? <p className="text-xs text-ink-3">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3", className)}>{children}</p>
  );
}
