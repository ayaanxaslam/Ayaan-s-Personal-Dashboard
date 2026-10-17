export function Logo({ size = 30 }: { size?: number }) {
  // Three arcs of dots, echoing the progress gauge.
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="10" fill="var(--ink)" />
      {[
        [8, 20],
        [9.5, 14],
        [13.5, 10],
        [18.5, 10],
        [22.5, 14],
        [24, 20],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={2}
          fill={i < 4 ? "var(--accent)" : "var(--surface)"}
          fillOpacity={i < 4 ? 1 : 0.3}
          style={i < 4 ? { fill: `color-mix(in oklab, var(--accent) ${100 - i * 25}%, var(--mint))` } : undefined}
        />
      ))}
      <circle cx="16" cy="21" r="2.5" fill="var(--mint)" />
    </svg>
  );
}
