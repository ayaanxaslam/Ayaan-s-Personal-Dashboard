import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BarChart3, Brain, Droplet, Dumbbell, Footprints, ListChecks, Moon, Target } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays, dateRange, formatRelativeDay, formatShortDate, formatWeekdayShort, startOfWeek } from "@/lib/dates";
import { buildIndex, dayGoals, habitConsistency, habitDayStats, seriesFor, summarise } from "@/lib/metrics";
import { formatMinutes, formatNumber, formatWater } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { dailyBars } from "@/lib/chart-data";
import { habitIcon } from "@/lib/habit-icons";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RangeTabs } from "@/components/ui/range-tabs";
import { BarChart, type BarDatum } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Stat } from "@/components/trackers/stat";
import { InsightsChat } from "@/components/insights/insights-chat";

export const metadata: Metadata = { title: "Insights" };
const RANGES = [7, 30, 90] as const;

function ChartCard({
  title,
  subtitle,
  icon,
  empty,
  emptyText,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon: ReactNode;
  empty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} />
      {empty ? <EmptyState compact title="Not enough data" description={emptyText} /> : children}
    </Card>
  );
}

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 30);
  const { supabase, user, settings, today, trackingStart } = await getUserContext();
  const from = addDays(today, -(range - 1));
  const records = await loadRecords(supabase, user.id, from, today);
  const idx = buildIndex(records);
  const unit = settings.water_unit;
  const days = dateRange(from, today);

  // Daily goal completion (habits + chosen tracker goals); null before tracking began.
  const goalSeries: BarDatum[] = days.map((date) => ({
    key: date,
    label: range <= 7 ? formatWeekdayShort(date).slice(0, 2) : formatShortDate(date).split(" ")[0],
    title: formatRelativeDay(date, today),
    value: dayGoals(idx, date, settings, trackingStart).percent,
  }));
  const goalDays = goalSeries.filter((d) => d.value !== null);
  const goalAvg = goalDays.length ? Math.round(goalDays.reduce((a, d) => a + d.value!, 0) / goalDays.length) : null;

  // Weekly habit completion.
  const weeks: BarDatum[] = [];
  for (let ws = startOfWeek(from, settings.week_starts_on); ws <= today; ws = addDays(ws, 7)) {
    let due = 0;
    let done = 0;
    for (const d of dateRange(ws < from ? from : ws, addDays(ws, 6) > today ? today : addDays(ws, 6))) {
      const s = habitDayStats(idx, d);
      due += s.due;
      done += s.done;
    }
    weeks.push({
      key: ws,
      label: formatShortDate(ws),
      title: `Week of ${formatShortDate(ws)}${ws < from ? " (partial)" : ""}`,
      value: due ? Math.round((done / due) * 100) : null,
    });
  }
  const habitTotals = days.reduce(
    (acc, d) => {
      const s = habitDayStats(idx, d);
      return { due: acc.due + s.due, done: acc.done + s.done };
    },
    { due: 0, done: 0 },
  );
  const consistency = idx.habits
    .map((h) => ({ habit: h, ...habitConsistency(h, idx, from > h.start_date ? from : h.start_date, today) }))
    .filter((c) => c.due > 0)
    .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));

  const sleep = summarise(seriesFor(idx.sleepByDate, from, today));
  const steps = summarise(seriesFor(idx.stepsByDate, from, today));
  const water = summarise(seriesFor(idx.waterByDate, from, today));
  const meditation = summarise(seriesFor(idx.meditationByDate, from, today));
  const workoutsDone = records.workouts.filter((w) => w.completed);
  const workoutMinutes = workoutsDone.reduce((a, w) => a + (w.duration_minutes ?? 0), 0);
  const recorded = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"} recorded`;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Insights"
        description="Trends from your saved records. Averages only include days you logged."
        action={<RangeTabs basePath="/insights" value={range} label="Date range" options={RANGES.map((r) => ({ value: r, label: `${r} days` }))} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <Stat
          label="Habit completion"
          value={habitTotals.due ? `${Math.round((habitTotals.done / habitTotals.due) * 100)}%` : "—"}
          sub={habitTotals.due ? `${habitTotals.done} of ${habitTotals.due} due` : "No habits due"}
        />
        <Stat label="Avg sleep" value={sleep.average !== null ? formatMinutes(sleep.average) : "—"} sub={recorded(sleep.recordedDays, "night")} />
        <Stat label="Avg steps" value={steps.average !== null ? formatNumber(steps.average) : "—"} sub={recorded(steps.recordedDays, "day")} />
        <Stat label="Avg water" value={water.average !== null ? formatWater(water.average, unit) : "—"} sub={recorded(water.recordedDays, "day")} />
        <Stat label="Workouts" value={workoutsDone.length} sub={workoutMinutes ? formatMinutes(workoutMinutes) : "completed"} />
        <Stat label="Meditation" value={meditation.total ? formatMinutes(meditation.total) : "—"} sub={recorded(records.meditation.length, "session")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="order-2 space-y-6 xl:order-1">
          <ChartCard
            title="Daily goal completion"
            subtitle={goalAvg !== null ? `Average ${goalAvg}% across ${goalDays.length} tracked days` : undefined}
            icon={<Target className="size-[18px]" />}
            empty={goalDays.length === 0}
            emptyText="Create habits or enable tracker goals in Settings to see daily completion."
          >
            <LineChart data={goalSeries} ariaLabel="Percentage of daily goals reached per day" valueLabel="Goals reached" />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Weekly habit completion"
              icon={<BarChart3 className="size-[18px]" />}
              empty={weeks.every((w) => w.value === null)}
              emptyText="No habits were due in this period."
            >
              <BarChart data={weeks} kind="percent" ariaLabel="Habit completion per week" valueLabel="Completion" height={160} />
            </ChartCard>
            <ChartCard
              title="Most consistent habits"
              icon={<ListChecks className="size-[18px]" />}
              empty={consistency.length === 0}
              emptyText="No habits were due in this period."
            >
              <ul className="space-y-3">
                {consistency.slice(0, 6).map((c) => {
                  const Icon = habitIcon(c.habit.icon);
                  return (
                    <li key={c.habit.id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                          <Icon className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                          <span className="truncate">{c.habit.name}</span>
                        </span>
                        <span className="tabular shrink-0 text-ink-3">
                          {c.percent}% · {c.done}/{c.due}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-track">
                        <div className="h-2 rounded-full bg-accent" style={{ width: `${c.percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Sleep"
              subtitle={sleep.average !== null ? `Average ${formatMinutes(sleep.average)} · ${recorded(sleep.recordedDays, "night")}` : undefined}
              icon={<Moon className="size-[18px]" />}
              empty={!sleep.recordedDays}
              emptyText="No sleep recorded in this period."
            >
              <BarChart data={dailyBars(idx.sleepByDate, from, today, today)} goal={settings.sleep_goal_minutes} kind="minutes" ariaLabel="Sleep per night" valueLabel="Sleep" height={160} />
            </ChartCard>
            <ChartCard
              title="Steps"
              subtitle={steps.average !== null ? `Average ${formatNumber(steps.average)} · ${recorded(steps.recordedDays, "day")}` : undefined}
              icon={<Footprints className="size-[18px]" />}
              empty={!steps.recordedDays}
              emptyText="No steps recorded in this period."
            >
              <BarChart data={dailyBars(idx.stepsByDate, from, today, today)} goal={settings.step_goal} kind="count" ariaLabel="Steps per day" valueLabel="Steps" height={160} />
            </ChartCard>
            <ChartCard
              title="Water"
              subtitle={water.average !== null ? `Average ${formatWater(water.average, unit)} · ${recorded(water.recordedDays, "day")}` : undefined}
              icon={<Droplet className="size-[18px]" />}
              empty={!water.recordedDays}
              emptyText="No water recorded in this period."
            >
              <BarChart data={dailyBars(idx.waterByDate, from, today, today)} goal={settings.water_goal_ml} kind="water" unit={unit} ariaLabel="Water per day" valueLabel="Water" height={160} />
            </ChartCard>
            <ChartCard
              title="Workouts"
              subtitle={`${workoutsDone.length} completed${workoutMinutes ? ` · ${formatMinutes(workoutMinutes)}` : ""}`}
              icon={<Dumbbell className="size-[18px]" />}
              empty={!workoutsDone.length}
              emptyText="No completed workouts in this period."
            >
              <BarChart data={dailyBars(idx.workoutMinutesByDate, from, today, today)} kind="minutes" ariaLabel="Workout minutes per day" valueLabel="Minutes" height={160} />
              <p className="mt-2 text-[11px] text-ink-3">Minutes from completed workouts with a logged duration.</p>
            </ChartCard>
            <ChartCard
              title="Meditation"
              subtitle={meditation.recordedDays ? `${formatMinutes(meditation.total)} · ${recorded(meditation.recordedDays, "day")}` : undefined}
              icon={<Brain className="size-[18px]" />}
              empty={!meditation.recordedDays}
              emptyText="No meditation recorded in this period."
            >
              <BarChart data={dailyBars(idx.meditationByDate, from, today, today)} goal={settings.meditation_goal_minutes} kind="minutes" ariaLabel="Meditation minutes per day" valueLabel="Minutes" height={160} />
            </ChartCard>
          </div>
        </div>

        <div className="order-1 xl:order-2">
          <div className="xl:sticky xl:top-8">
            <InsightsChat configured={Boolean(process.env.OPENAI_API_KEY)} />
          </div>
        </div>
      </div>
    </div>
  );
}
