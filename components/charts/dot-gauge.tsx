"use client";

import { useEffect, useRef, useState } from "react";

const CX = 160;
const CY = 164;
const RINGS = [
  { r: 148, dot: 4.6 },
  { r: 127, dot: 4.3 },
  { r: 106, dot: 4 },
  { r: 85, dot: 3.7 },
];
const SPACING = 12.6;

type Dot = { x: number; y: number; r: number; p: number };

const DOTS: Dot[] = RINGS.flatMap(({ r, dot }) => {
  const n = Math.max(2, Math.round((Math.PI * r) / SPACING));
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const angle = Math.PI - p * Math.PI;
    // Rounded so server and client render identical attributes.
    const round = (v: number) => Math.round(v * 100) / 100;
    return { x: round(CX + r * Math.cos(angle)), y: round(CY - r * Math.sin(angle)), r: dot, p };
  });
});

/**
 * Semicircle of dots that fill left→right, turquoise easing into mint.
 * `percent` null means nothing is due yet (rendered as an empty gauge).
 */
export function DotGauge({ percent, label }: { percent: number | null; label: string }) {
  const [shown, setShown] = useState(false);
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const target = percent ?? 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Count the number up alongside the dots.
  useEffect(() => {
    const from = displayRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = reduce ? 1 : Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - k, 3);
      const next = Math.round(from + (target - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const filledUpTo = target / 100;

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <svg viewBox="0 0 320 176" className="w-full" role="img" aria-label={label}>
        {DOTS.map((d, i) => {
          const filled = percent !== null && target > 0 && d.p <= filledUpTo + 0.0001;
          const color = `color-mix(in oklab, var(--accent) ${Math.round((1 - d.p) * 100)}%, var(--mint))`;
          return (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.r}
              style={{
                fill: shown && filled ? color : "var(--track)",
                transition: "fill 420ms ease-out",
                transitionDelay: shown && filled ? `${Math.round(d.p * 650)}ms` : "0ms",
              }}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center" aria-hidden>
        <span className="tabular text-[56px] leading-none font-bold tracking-tight text-ink sm:text-[64px]">
          {percent === null ? "—" : display}
        </span>
        <span className="mt-1 text-[11px] font-semibold tracking-[0.2em] text-ink-3">PERCENT</span>
      </div>
    </div>
  );
}
