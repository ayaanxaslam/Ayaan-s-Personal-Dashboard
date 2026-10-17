import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { buildIndex, seriesFor, summarise } from "@/lib/metrics";
import { formatMinutes, pct } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { dailyBars } from "@/lib/chart-data";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { BarChart } from "@/components/charts/bar-chart";
import { Ring } from "@/components/charts/ring";
import { MeditationDialogButton } from "@/components/trackers/dialog-buttons";
import { MeditationList } from "@/components/trackers/record-lists";
import { Stat } from "@/components/trackers/stat";

export const metadata: Metadata = { title: "Meditation" };
const RANGES = [30, 90, 365] as const;

export default async function MeditationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 30);
  const { supabase, user, settings, today } = await getUserContext();
  const from = addDays(today, -(range - 1));
  const weekFrom = addDays(today, -6);
  const records = await loadRecords(supabase, user.id, from, today, { meditation: true });
  const idx = buildIndex(records);
  const goal = settings.meditation_goal_minutes;
  const minutes = idx.meditationByDate.get(today) ?? 0;
  const sessionsToday = records.meditation.filter((m) => m.session_date === today).length;
  const week = summarise(seriesFor(idx.meditationByDate, weekFrom, today));
  const period = summarise(seriesFor(idx.meditationByDate, from, today));
  const p = pct(minutes, goal);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex flex-col items-center text-center">
          <Ring value={p} size={168} stroke={14} color="var(--mint)" label={`${p}% of today's meditation goal`}>
            <span className="tabular text-3xl font-bold text-ink">{minutes ? formatMinutes(minutes) : "—"}</span>
            <span className="text-[11px] font-semibold tracking-wider text-ink-3 uppercase">
              {sessionsToday ? `${p}% of ${formatMinutes(goal)}` : "No session today"}
            </span>
          </Ring>
          <div className="mt-5">
            <MeditationDialogButton today={today} label="Log session" title="Log meditation" />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Last 7 days"
            icon={<Brain className="size-[18px]" />}
            subtitle={week.recordedDays ? `${formatMinutes(week.total)} across ${week.recordedDays} days` : "No sessions this week"}
          />
          <BarChart data={dailyBars(idx.meditationByDate, weekFrom, today, today)} goal={goal} kind="minutes" ariaLabel="Meditation minutes per day, last 7 days" valueLabel="Minutes" />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label={`${range}-day total`} value={period.total ? formatMinutes(period.total) : "—"} sub={`${records.meditation.length} sessions`} />
        <Stat label="Average per day" value={period.average !== null ? formatMinutes(period.average) : "—"} sub={`on ${period.recordedDays} days with a session`} />
        <Stat label="Days at goal" value={[...idx.meditationByDate.values()].filter((v) => v >= goal).length} sub={`of ${period.recordedDays} days`} />
      </div>

      <Card>
        <CardHeader title="Sessions" action={<RangeTabs basePath="/activity/meditation" value={range} label="History range" options={RANGES.map((r) => ({ value: r, label: `${r}d` }))} />} />
        {records.meditation.length ? (
          <MeditationList records={[...records.meditation].reverse()} today={today} />
        ) : (
          <EmptyState icon={<Brain className="size-5" />} title="No sessions yet" description={`Nothing logged in the last ${range} days.`} />
        )}
      </Card>
    </div>
  );
}
