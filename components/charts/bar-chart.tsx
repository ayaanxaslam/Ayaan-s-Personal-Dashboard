"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatCompact, formatHours, formatMinutes, formatNumber, formatWater, mlToUnit } from "@/lib/format";
import type { WaterUnit } from "@/lib/types";

export type ValueKind = "count" | "minutes" | "water" | "percent";

function formatters(kind: ValueKind, unit: WaterUnit) {
  if (kind === "percent") return { format: (v: number) => `${Math.round(v)}%`, axis: (v: number) => `${Math.round(v)}%` };
  if (kind === "minutes")
    return { format: formatMinutes, axis: (v: number) => (v >= 120 ? formatHours(v).replace(".0h", "h") : `${Math.round(v)}m`) };
  if (kind === "water")
    return {
      format: (v: number) => formatWater(v, unit),
      axis: (v: number) => (unit === "ml" ? (v >= 1000 ? `${+(v / 1000).toFixed(1)}L` : `${Math.round(v)}`) : `${+mlToUnit(v, unit).toFixed(1)}`),
    };
  return { format: formatNumber, axis: (v: number) => (v >= 1000 ? formatCompact(v) : formatNumber(v)) };
}

export type BarDatum = {
  key: string;
  /** Short axis label, e.g. "M" or "14". */
  label: string;
  /** Full label for the tooltip and table, e.g. "Mon 14 Oct". */
  title: string;
  value: number | null;
};

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * exp;
}

/**
 * Single-series column chart. Missing days render as a small hollow marker
 * at the baseline (never a zero bar), with a hover tooltip and a hidden
 * table for screen readers.
 */
export function BarChart({
  data,
  goal,
  goalLabel = "Goal",
  kind = "count",
  unit = "ml",
  height = 180,
  ariaLabel,
  valueLabel,
}: {
  data: BarDatum[];
  goal?: number | null;
  goalLabel?: string;
  kind?: ValueKind;
  unit?: WaterUnit;
  height?: number;
  ariaLabel: string;
  valueLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const values = data.map((d) => d.value ?? 0);
  const max = kind === "percent" ? 100 : niceMax(Math.max(...values, goal ?? 0, 0) * 1.05);
  const labelEvery = data.length > 45 ? 14 : data.length > 20 ? 7 : data.length > 10 ? 2 : 1;
  const { format, axis } = formatters(kind, unit);
  const goalPos = goal ? Math.min(1, goal / max) : null;

  return (
    <figure className="w-full">
      <div className="flex gap-2">
        <div className="relative w-9 shrink-0 text-right text-[10px] text-ink-3 tabular" style={{ height }} aria-hidden>
          <span className="absolute right-0 -translate-y-1/2" style={{ top: 0 }}>
            {axis(max)}
          </span>
          <span className="absolute right-0 -translate-y-1/2" style={{ top: height / 2 }}>
            {axis(max / 2)}
          </span>
          <span className="absolute right-0 -translate-y-1/2" style={{ top: height }}>
            0
          </span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="relative" style={{ height }} role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
            {/* gridlines */}
            <div className="absolute inset-x-0 top-0 h-px bg-line" aria-hidden />
            <div className="absolute inset-x-0 h-px bg-line" style={{ top: height / 2 }} aria-hidden />
            <div className="absolute inset-x-0 bottom-0 h-px bg-line" aria-hidden />
            {goalPos !== null ? (
              <div
                className="absolute inset-x-0 z-10 h-px bg-ink-3/70"
                style={{ bottom: `${goalPos * 100}%` }}
                aria-hidden
              >
                <span className="absolute -top-4 right-0 rounded bg-surface px-1 text-[10px] font-semibold text-ink-3">
                  {goalLabel}
                </span>
              </div>
            ) : null}
            <div className="absolute inset-0 flex items-end">
              {data.map((d, i) => {
                const h = d.value !== null ? Math.max(d.value > 0 ? 3 : 0, (d.value / max) * height) : 0;
                return (
                  <button
                    type="button"
                    key={d.key}
                    className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${d.title}: ${d.value === null ? "no record" : format(d.value)}`}
                    tabIndex={-1}
                  >
                    {d.value === null ? (
                      <span className="mb-[-3px] size-1.5 rounded-full ring-1 ring-ink-3/50" />
                    ) : (
                      <span
                        className={cn(
                          "w-[min(24px,60%)] rounded-t-[4px] transition-[height,opacity] duration-500 ease-out",
                          active !== null && active !== i ? "opacity-50" : "opacity-100",
                        )}
                        style={{ height: h, background: "var(--accent)" }}
                      />
                    )}
                    {active === i ? (
                      <span
                        className={cn(
                          "pointer-events-none absolute bottom-full z-20 mb-1 -translate-y-1 whitespace-nowrap",
                          i < data.length * 0.25 ? "left-0" : i > data.length * 0.75 ? "right-0" : "left-1/2 -translate-x-1/2",
                        )}
                      >
                        <span className="block rounded-xl bg-ink px-2.5 py-1.5 text-left text-[11px] text-surface shadow-float">
                        <span className="block opacity-70">{d.title}</span>
                        <span className="block font-semibold tabular">
                          {d.value === null ? "No record" : format(d.value)}
                          {d.value !== null && goal ? (d.value >= goal ? " · goal met" : "") : ""}
                        </span>
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-2 flex" aria-hidden>
            {data.map((d, i) => (
              <span key={d.key} className="flex-1 text-center text-[10px] text-ink-3">
                {showLabel(i, data.length, labelEvery) ? d.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.title}</td>
              <td>{d.value === null ? "No record" : format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Label every nth tick, plus the last one when it won't collide with its neighbour. */
function showLabel(i: number, n: number, every: number): boolean {
  if (i % every === 0) return true;
  return i === n - 1 && (n - 1) % every >= Math.ceil(every / 2);
}
