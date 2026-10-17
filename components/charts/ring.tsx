import type { ReactNode } from "react";

/** Circular progress ring. `value` is 0–100. */
export function Ring({
  value,
  size = 132,
  stroke = 12,
  label,
  children,
  color = "var(--accent)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: ReactNode;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={v === 0 ? c : c * (1 - v / 100)}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(.2,.8,.2,1)", opacity: v === 0 ? 0 : 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
