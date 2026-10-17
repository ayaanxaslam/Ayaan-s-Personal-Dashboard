import type { Metadata } from "next";
import { Moon } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays, dateRange, formatRelativeDay, formatWeekdayShort } from "@/lib/dates";
import { buildIndex, seriesFor, summarise } from "@/lib/metrics";
import { formatMinutes } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { SleepColumns } from "@/components/charts/sleep-columns";
import { SleepDialogButton } from "@/components/trackers/dialog-buttons";
import { SleepList } from "@/components/trackers/record-lists";
import { Stat, StatGrid } from "@/components/trackers/stat";

export const metadata: Metadata = { title: "Sleep" };
const RANGES = [30, 90, 365] as const;

export default async function SleepPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 30);
  const { supabase, user, settings, today } = await getUserContext();
  const from = addDays(today, -(range - 1));
  const weekFrom = addDays(today, -6);
  const records = await loadRecords(supabase, user.id, from, today, { sleep: true });
  const idx = buildIndex(records);
  const goal = settings.sleep_goal_minutes;
  const week = summarise(seriesFor(idx.sleepByDate, weekFrom, today));
  const period = summarise(seriesFor(idx.sleepByDate, from, today));
  const nightsAtGoal = records.sleep.filter((s) => s.duration_minutes >= goal).length;
  const last = idx.sleepByDate.get(today);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex justify-end">
        <SleepDialogButton today={today} existingDates={records.sleep.map((s) => s.sleep_date)} label="Log sleep" title="Log sleep" />
      </div>
      <StatGrid>
        <Stat label="Last night" value={last !== undefined ? formatMinutes(last) : "—"} sub={last !== undefined ? undefined : "Not logged"} />
        <Stat label="Goal" value={formatMinutes(goal)} sub="Change in Settings" />
        <Stat
          label="7-day average"
          value={week.average !== null ? formatMinutes(week.average) : "—"}
          sub={`${week.recordedDays} of 7 nights logged`}
        />
        <Stat
          label={`${range}-day average`}
          value={period.average !== null ? formatMinutes(period.average) : "—"}
          sub={period.recordedDays ? `${nightsAtGoal} of ${period.recordedDays} nights at goal` : "No records"}
        />
      </StatGrid>

      <Card>
        <CardHeader title="This week" subtitle="Each block is one hour" icon={<Moon className="size-[18px]" />} />
        <SleepColumns
          goalMinutes={goal}
          segmentHeight={14}
          days={dateRange(weekFrom, today).map((date) => ({
            date,
            label: formatWeekdayShort(date),
            title: formatRelativeDay(date, today),
            minutes: idx.sleepByDate.get(date) ?? null,
            isToday: date === today,
          }))}
        />
      </Card>

      <Card>
        <CardHeader title="History" action={<RangeTabs basePath="/activity/sleep" value={range} label="History range" options={RANGES.map((r) => ({ value: r, label: `${r}d` }))} />} />
        {records.sleep.length ? (
          <SleepList records={[...records.sleep].reverse()} today={today} />
        ) : (
          <EmptyState icon={<Moon className="size-5" />} title="No sleep records yet" description={`Nothing logged in the last ${range} days.`} />
        )}
      </Card>
    </div>
  );
}
