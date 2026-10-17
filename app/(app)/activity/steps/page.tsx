import type { Metadata } from "next";
import { Footprints } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { buildIndex, seriesFor, summarise } from "@/lib/metrics";
import { formatNumber, pct } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { dailyBars } from "@/lib/chart-data";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { BarChart } from "@/components/charts/bar-chart";
import { Ring } from "@/components/charts/ring";
import { StepsDialogButton } from "@/components/trackers/dialog-buttons";
import { StepsList } from "@/components/trackers/record-lists";
import { Stat } from "@/components/trackers/stat";

export const metadata: Metadata = { title: "Steps" };
const RANGES = [30, 90, 365] as const;

export default async function StepsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 30);
  const { supabase, user, settings, today } = await getUserContext();
  const from = addDays(today, -(range - 1));
  const weekFrom = addDays(today, -6);
  const records = await loadRecords(supabase, user.id, from, today, { steps: true });
  const idx = buildIndex(records);
  const goal = settings.step_goal;
  const todaySteps = idx.stepsByDate.get(today);
  const week = summarise(seriesFor(idx.stepsByDate, weekFrom, today));
  const period = summarise(seriesFor(idx.stepsByDate, from, today));
  const p = todaySteps !== undefined ? pct(todaySteps, goal) : 0;

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center text-center">
          <Ring value={p} size={168} stroke={14} label={`${p}% of today's step goal`}>
            <span className="tabular text-3xl font-bold text-ink">{todaySteps !== undefined ? formatNumber(todaySteps) : "—"}</span>
            <span className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
              {todaySteps !== undefined ? `${p}% of ${formatNumber(goal)}` : "Not logged today"}
            </span>
          </Ring>
          <div className="mt-5">
            <StepsDialogButton today={today} existing={records.steps} label={todaySteps !== undefined ? "Update steps" : "Add steps"} title="Steps" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Last 7 days" icon={<Footprints className="size-[18px]" />} subtitle={week.average !== null ? `Average ${formatNumber(week.average)} over ${week.recordedDays} logged days` : "No steps logged this week"} />
          <BarChart data={dailyBars(idx.stepsByDate, weekFrom, today, today)} goal={goal} kind="count" ariaLabel="Steps per day, last 7 days" valueLabel="Steps" />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={`${range}-day average`} value={period.average !== null ? formatNumber(period.average) : "—"} sub={`${period.recordedDays} days logged`} />
        <Stat label="Best day" value={period.max !== null ? formatNumber(period.max) : "—"} />
        <Stat label="Days at goal" value={records.steps.filter((s) => s.steps >= goal).length} sub={`of ${period.recordedDays} logged`} />
      </div>

      <Card>
        <CardHeader title="History" action={<RangeTabs basePath="/activity/steps" value={range} label="History range" options={RANGES.map((r) => ({ value: r, label: `${r}d` }))} />} />
        {records.steps.length ? (
          <StepsList records={[...records.steps].reverse()} today={today} />
        ) : (
          <EmptyState icon={<Footprints className="size-5" />} title="No step records yet" description={`Nothing logged in the last ${range} days. Steps are entered manually.`} />
        )}
      </Card>
    </div>
  );
}
