import type { Metadata } from "next";
import { Droplet } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays, formatRelativeDay } from "@/lib/dates";
import { buildIndex, seriesFor, summarise } from "@/lib/metrics";
import { formatWater, pct } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { dailyBars } from "@/lib/chart-data";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { BarChart } from "@/components/charts/bar-chart";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { WaterDialogButton } from "@/components/trackers/dialog-buttons";
import { WaterQuickAdd } from "@/components/trackers/water-quick-add";
import { WaterList } from "@/components/trackers/record-lists";
import type { WaterRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Water" };
const RANGES = [7, 30, 90] as const;

export default async function WaterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 7);
  const { supabase, user, settings, timeZone, today } = await getUserContext();
  const from = addDays(today, -(Math.max(range, 7) - 1));
  const weekFrom = addDays(today, -6);
  const records = await loadRecords(supabase, user.id, from, today, { water: true });
  const idx = buildIndex(records);
  const unit = settings.water_unit;
  const total = idx.waterByDate.get(today) ?? 0;
  const todayEntries = records.water.filter((w) => w.record_date === today);
  const week = summarise(seriesFor(idx.waterByDate, weekFrom, today));
  const p = pct(total, settings.water_goal_ml);

  // Group older entries by day, newest first.
  const historyFrom = addDays(today, -(range - 1));
  const byDay = new Map<string, WaterRecord[]>();
  for (const w of [...records.water].reverse()) {
    if (w.record_date === today || w.record_date < historyFrom) continue;
    byDay.set(w.record_date, [...(byDay.get(w.record_date) ?? []), w]);
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Today"
            icon={<Droplet className="size-[18px]" />}
            subtitle={`Goal ${formatWater(settings.water_goal_ml, unit)}`}
            action={<WaterDialogButton today={today} unit={unit} label="Custom amount" title="Add water" variant="soft" size="sm" />}
          />
          <p className="tabular text-4xl font-bold tracking-tight text-ink">{formatWater(total, unit)}</p>
          <p className="mb-4 text-xs text-ink-3">{p}% of goal · {todayEntries.length} {todayEntries.length === 1 ? "entry" : "entries"}</p>
          <SegmentedBar value={p} segments={12} label="Water towards today's goal" className="mb-5" />
          <WaterQuickAdd today={today} increments={settings.water_increments_ml} unit={unit} lastEntryId={todayEntries.at(-1)?.id ?? null} />
          <div className="mt-5">
            {todayEntries.length ? (
              <WaterList records={[...todayEntries].reverse()} today={today} unit={unit} timeZone={timeZone} />
            ) : (
              <EmptyState compact title="No water logged today" description="Tap an amount above to add it." />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Last 7 days"
            subtitle={week.average !== null ? `Average ${formatWater(week.average, unit)} on ${week.recordedDays} logged days` : "Nothing logged this week"}
          />
          <BarChart
            data={dailyBars(idx.waterByDate, weekFrom, today, today)}
            goal={settings.water_goal_ml}
            kind="water"
            unit={unit}
            ariaLabel="Water per day, last 7 days"
            valueLabel="Water"
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Earlier entries"
          action={<RangeTabs basePath="/activity/water" value={range} label="History range" options={RANGES.map((r) => ({ value: r, label: `${r}d` }))} />}
        />
        {byDay.size ? (
          <div className="space-y-5">
            {[...byDay.entries()].map(([date, entries]) => (
              <section key={date}>
                <h3 className="flex items-baseline justify-between border-b border-line pb-2 text-xs font-semibold text-ink-2">
                  {formatRelativeDay(date, today)}
                  <span className="tabular text-ink">{formatWater(idx.waterByDate.get(date) ?? 0, unit)}</span>
                </h3>
                <WaterList records={entries} today={today} unit={unit} timeZone={timeZone} />
              </section>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Droplet className="size-5" />} title="No earlier entries" description={`Nothing logged before today in the last ${range} days.`} />
        )}
      </Card>
    </div>
  );
}
