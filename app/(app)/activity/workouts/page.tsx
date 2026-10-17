import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays, formatShortDate, startOfWeek } from "@/lib/dates";
import { buildIndex } from "@/lib/metrics";
import { ACTIVITY_LABELS, formatMinutes } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { dailyBars } from "@/lib/chart-data";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { BarChart } from "@/components/charts/bar-chart";
import { WorkoutDialogButton } from "@/components/trackers/dialog-buttons";
import { WorkoutList } from "@/components/trackers/record-lists";
import { Stat, StatGrid } from "@/components/trackers/stat";
import type { WorkoutRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Workouts" };
const RANGES = [30, 90, 365] as const;

function weekStats(workouts: WorkoutRecord[], from: string, to: string) {
  const done = workouts.filter((w) => w.completed && w.workout_date >= from && w.workout_date <= to);
  const byType = new Map<string, { count: number; minutes: number }>();
  for (const w of done) {
    const key = ACTIVITY_LABELS[w.activity_type];
    const cur = byType.get(key) ?? { count: 0, minutes: 0 };
    byType.set(key, { count: cur.count + 1, minutes: cur.minutes + (w.duration_minutes ?? 0) });
  }
  return {
    count: done.length,
    minutes: done.reduce((a, w) => a + (w.duration_minutes ?? 0), 0),
    activeDays: new Set(done.map((w) => w.workout_date)).size,
    byType: [...byType.entries()].sort((a, b) => b[1].count - a[1].count),
  };
}

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 30);
  const { supabase, user, settings, today } = await getUserContext();
  const thisWeekStart = startOfWeek(today, settings.week_starts_on);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const from = [addDays(today, -(range - 1)), lastWeekStart].sort()[0];
  const records = await loadRecords(supabase, user.id, from, today, { workouts: true });
  const idx = buildIndex(records);
  const thisWeek = weekStats(records.workouts, thisWeekStart, today);
  const lastWeek = weekStats(records.workouts, lastWeekStart, addDays(thisWeekStart, -1));
  const historyFrom = addDays(today, -(range - 1));
  const history = records.workouts.filter((w) => w.workout_date >= historyFrom).reverse();
  const maxType = Math.max(1, ...thisWeek.byType.map(([, v]) => v.count));

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex justify-end">
        <WorkoutDialogButton today={today} label="Add workout" title="Add workout" />
      </div>
      <StatGrid>
        <Stat label="This week" value={thisWeek.count} sub={`since ${formatShortDate(thisWeekStart)}`} />
        <Stat label="Active minutes" value={thisWeek.minutes ? formatMinutes(thisWeek.minutes) : "—"} sub="where duration was logged" />
        <Stat label="Active days" value={thisWeek.activeDays} sub="this week" />
        <Stat label="Last week" value={lastWeek.count} sub={lastWeek.minutes ? formatMinutes(lastWeek.minutes) : "no duration logged"} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Minutes per day" subtitle="Completed workouts, last 7 days" icon={<Dumbbell className="size-[18px]" />} />
          <BarChart
            data={dailyBars(idx.workoutMinutesByDate, addDays(today, -6), today, today)}
            kind="minutes"
            ariaLabel="Workout minutes per day, last 7 days"
            valueLabel="Minutes"
          />
          <p className="mt-3 text-[11px] text-ink-3">Days without a completed, timed workout show as an empty marker.</p>
        </Card>
        <Card>
          <CardHeader title="This week by activity" />
          {thisWeek.byType.length ? (
            <ul className="space-y-3">
              {thisWeek.byType.map(([name, v]) => (
                <li key={name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-ink">{name}</span>
                    <span className="tabular text-ink-3">
                      {v.count}× {v.minutes ? `· ${formatMinutes(v.minutes)}` : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-track">
                    <div className="h-2 rounded-full bg-accent" style={{ width: `${(v.count / maxType) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="No completed workouts this week" />
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="History" action={<RangeTabs basePath="/activity/workouts" value={range} label="History range" options={RANGES.map((r) => ({ value: r, label: `${r}d` }))} />} />
        {history.length ? (
          <WorkoutList records={history} today={today} />
        ) : (
          <EmptyState icon={<Dumbbell className="size-5" />} title="No workouts yet" description={`Nothing logged in the last ${range} days.`} />
        )}
      </Card>
    </div>
  );
}
