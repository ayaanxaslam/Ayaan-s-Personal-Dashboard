import { formatMinutes } from "@/lib/format";

/**
 * Weekly sleep view: each night is a column of rounded one-hour segments,
 * with the goal hour marked. Nights without a record show an empty column.
 */
export function SleepColumns({
  days,
  goalMinutes,
  maxHours = 10,
  segmentHeight = 11,
}: {
  days: Array<{ date: string; label: string; title: string; minutes: number | null; isToday?: boolean }>;
  goalMinutes: number;
  maxHours?: number;
  segmentHeight?: number;
}) {
  const hours = Math.max(maxHours, Math.ceil(Math.max(goalMinutes, ...days.map((d) => d.minutes ?? 0)) / 60));
  const goalHours = goalMinutes / 60;

  return (
    <figure>
      <div className="flex items-end justify-between gap-1.5 sm:gap-2" role="img" aria-label="Sleep per night this week">
        {days.map((d) => {
          const filled = (d.minutes ?? 0) / 60;
          return (
            <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-ink-2 tabular">
                {d.minutes === null ? "–" : formatMinutes(d.minutes).replace(/m$/, "m")}
              </span>
              <div className="flex w-full max-w-[26px] flex-col-reverse gap-[2px]" title={d.title}>
                {Array.from({ length: hours }, (_, i) => {
                  const fill = Math.max(0, Math.min(1, filled - i));
                  const isGoal = i < goalHours && i + 1 >= goalHours;
                  return (
                    <span
                      key={i}
                      className="relative overflow-hidden rounded-[4px] bg-track"
                      style={{
                        height: segmentHeight,
                        boxShadow: isGoal ? "inset 0 -2px 0 0 var(--ink-3)" : undefined,
                      }}
                    >
                      <span
                        className="absolute inset-x-0 bottom-0 rounded-[4px]"
                        style={{
                          height: `${fill * 100}%`,
                          background: filled >= goalHours ? "var(--mint)" : "var(--accent)",
                        }}
                      />
                    </span>
                  );
                })}
              </div>
              <span className={`text-[11px] ${d.isToday ? "font-bold text-ink" : "text-ink-3"}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 flex items-center gap-4 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-accent" aria-hidden /> Below goal
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-mint" aria-hidden /> Goal met
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 bg-ink-3" aria-hidden /> Goal ({formatMinutes(goalMinutes)})
        </span>
      </figcaption>
      <table className="sr-only">
        <caption>Sleep per night</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.title}</td>
              <td>{d.minutes === null ? "No record" : formatMinutes(d.minutes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
