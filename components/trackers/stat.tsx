import type { ReactNode } from "react";

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{label}</p>
      <p className="tabular mt-1 text-xl font-bold tracking-tight text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink-3">{sub}</p> : null}
    </div>
  );
}
