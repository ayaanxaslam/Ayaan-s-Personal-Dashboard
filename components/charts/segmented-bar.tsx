import { cn } from "@/lib/cn";

/** Horizontal progress made of rounded segments. `value` is 0–100. */
export function SegmentedBar({
  value,
  segments = 12,
  label,
  className,
}: {
  value: number;
  segments?: number;
  label: string;
  className?: string;
}) {
  const filled = (Math.max(0, Math.min(100, value)) / 100) * segments;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("flex h-3 gap-[3px]", className)}
    >
      {Array.from({ length: segments }, (_, i) => {
        const fill = Math.max(0, Math.min(1, filled - i));
        return (
          <span key={i} className="relative flex-1 overflow-hidden rounded-[4px] bg-track">
            <span
              className="absolute inset-y-0 left-0 rounded-[4px]"
              style={{
                width: `${fill * 100}%`,
                background: `color-mix(in oklab, var(--accent) ${Math.round((1 - i / Math.max(1, segments - 1)) * 100)}%, var(--mint))`,
                transition: "width 500ms ease-out",
                transitionDelay: `${i * 30}ms`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
