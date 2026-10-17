import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-3">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}
