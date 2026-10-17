"use client";

import { useEffect, useRef, useState } from "react";
import type { BarDatum } from "./bar-chart";

/**
 * Percentage line (0–100). Gaps in the data break the line instead of
 * being drawn as zero. Hover shows a crosshair and tooltip.
 */
export function LineChart({
  data,
  height = 180,
  ariaLabel,
  valueLabel,
}: {
  data: BarDatum[];
  height?: number;
  ariaLabel: string;
  valueLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pad = 6;
  const n = data.length;
  const x = (i: number) => (n <= 1 ? width / 2 : pad + (i / (n - 1)) * (width - pad * 2));
  const y = (v: number) => pad + (1 - v / 100) * (height - pad * 2);

  // Split into continuous runs.
  const runs: Array<Array<{ i: number; v: number }>> = [];
  let cur: Array<{ i: number; v: number }> = [];
  data.forEach((d, i) => {
    if (d.value === null) {
      if (cur.length) runs.push(cur);
      cur = [];
    } else cur.push({ i, v: d.value });
  });
  if (cur.length) runs.push(cur);

  const line = (run: Array<{ i: number; v: number }>) =>
    run.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = (run: Array<{ i: number; v: number }>) =>
    `${line(run)}L${x(run[run.length - 1].i).toFixed(1)},${y(0)}L${x(run[0].i).toFixed(1)},${y(0)}Z`;

  const labelEvery = n > 45 ? 14 : n > 20 ? 7 : n > 10 ? 2 : 1;
  const lastIdx = [...data].reverse().findIndex((d) => d.value !== null);
  const last = lastIdx === -1 ? null : n - 1 - lastIdx;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!width || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - pad) / Math.max(1, width - pad * 2);
    setActive(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  }

  const a = active !== null ? data[active] : null;

  return (
    <figure className="w-full">
      <div className="flex gap-2">
        <div className="relative w-9 shrink-0 text-right text-[10px] text-ink-3 tabular" style={{ height }} aria-hidden>
          {[100, 50, 0].map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: y(t) }}>
              {t}%
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={ref}
            className="relative"
            style={{ height }}
            onMouseMove={onMove}
            onMouseLeave={() => setActive(null)}
            role="img"
            aria-label={ariaLabel}
          >
            {width > 0 ? (
              <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden>
                {[100, 50, 0].map((t) => (
                  <line key={t} x1={0} x2={width} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                ))}
                {runs.map((run, k) => (
                  <path key={`a${k}`} d={area(run)} fill="var(--accent)" fillOpacity={0.1} />
                ))}
                {runs.map((run, k) =>
                  run.length === 1 ? (
                    <circle key={`p${k}`} cx={x(run[0].i)} cy={y(run[0].v)} r={3} fill="var(--accent)" />
                  ) : (
                    <path
                      key={`l${k}`}
                      d={line(run)}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ),
                )}
                {last !== null && active === null ? (
                  <circle
                    cx={x(last)}
                    cy={y(data[last].value!)}
                    r={4.5}
                    fill="var(--accent)"
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ) : null}
                {active !== null ? (
                  <>
                    <line x1={x(active)} x2={x(active)} y1={0} y2={height} stroke="var(--ink-3)" strokeOpacity={0.4} />
                    {a?.value !== null && a ? (
                      <circle
                        cx={x(active)}
                        cy={y(a.value!)}
                        r={5}
                        fill="var(--accent)"
                        stroke="var(--surface)"
                        strokeWidth={2}
                      />
                    ) : null}
                  </>
                ) : null}
              </svg>
            ) : null}
            {a && active !== null ? (
              <div
                className="pointer-events-none absolute -top-2 z-20 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-2.5 py-1.5 text-[11px] text-surface shadow-float"
                style={{
                  left: Math.min(Math.max(x(active) - 60, 0), Math.max(0, width - 120)),
                }}
              >
                <span className="block opacity-70">{a.title}</span>
                <span className="block font-semibold tabular">{a.value === null ? "No data" : `${a.value}%`}</span>
              </div>
            ) : null}
          </div>
          <div className="relative mt-2 h-3.5" aria-hidden>
            {width > 0
              ? data.map((d, i) =>
                  showLabel(i, n, labelEvery) ? (
                    <span
                      key={d.key}
                      className="absolute -translate-x-1/2 text-[10px] whitespace-nowrap text-ink-3"
                      style={{ left: x(i) }}
                    >
                      {d.label}
                    </span>
                  ) : null,
                )
              : null}
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
              <td>{d.value === null ? "No data" : `${d.value}%`}</td>
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
