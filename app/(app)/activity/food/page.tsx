import type { Metadata } from "next";
import { Utensils } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays, formatRelativeDay } from "@/lib/dates";
import { buildIndex } from "@/lib/metrics";
import { MEAL_LABELS } from "@/lib/format";
import { parseRange } from "@/lib/range";
import { dailyBars } from "@/lib/chart-data";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RangeTabs } from "@/components/ui/range-tabs";
import { BarChart } from "@/components/charts/bar-chart";
import { FoodDialogButton } from "@/components/trackers/dialog-buttons";
import { FoodList } from "@/components/trackers/record-lists";
import { MEAL_TYPES, type FoodRecord } from "@/lib/types";

export const metadata: Metadata = { title: "Food" };
const RANGES = [7, 30, 90] as const;

export default async function FoodPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const range = parseRange((await searchParams).range, RANGES, 7);
  const { supabase, user, today } = await getUserContext();
  const from = addDays(today, -(Math.max(range, 7) - 1));
  const weekFrom = addDays(today, -6);
  const records = await loadRecords(supabase, user.id, from, today, { food: true });
  const idx = buildIndex(records);
  const todays = records.food.filter((f) => f.entry_date === today);

  const historyFrom = addDays(today, -(range - 1));
  const byDay = new Map<string, FoodRecord[]>();
  for (const f of [...records.food].reverse()) {
    if (f.entry_date === today || f.entry_date < historyFrom) continue;
    byDay.set(f.entry_date, [...(byDay.get(f.entry_date) ?? []), f]);
  }
  const mealOrder = (f: FoodRecord) => MEAL_TYPES.indexOf(f.meal_type);

  return (
    <div className="animate-fade-up space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Today"
            icon={<Utensils className="size-[18px]" />}
            subtitle={todays.length ? `${todays.length} ${todays.length === 1 ? "entry" : "entries"}` : "Nothing logged yet"}
            action={<FoodDialogButton today={today} label="Log food" title="Log food" size="sm" />}
          />
          {todays.length ? (
            <FoodList records={[...todays].sort((a, b) => mealOrder(a) - mealOrder(b))} today={today} showDate={false} />
          ) : (
            <EmptyState
              compact
              title="No food logged today"
              description="Write down what you eat and drink. The AI chat can help you spot patterns."
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Entries per day" subtitle="Last 7 days" />
          <BarChart data={dailyBars(idx.mealsByDate, weekFrom, today, today)} kind="count" ariaLabel="Food entries per day, last 7 days" valueLabel="Entries" height={160} />
          <p className="mt-3 text-[11px] text-ink-3">
            This counts what you&apos;ve logged — it isn&apos;t a judgement of how much you ate.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Earlier days"
          action={<RangeTabs basePath="/activity/food" value={range} label="History range" options={RANGES.map((r) => ({ value: r, label: `${r}d` }))} />}
        />
        {byDay.size ? (
          <div className="space-y-5">
            {[...byDay.entries()].map(([date, entries]) => (
              <section key={date}>
                <h3 className="flex items-baseline justify-between border-b border-line pb-2 text-xs font-semibold text-ink-2">
                  {formatRelativeDay(date, today)}
                  <span className="font-normal text-ink-3">
                    {[...new Set(entries.map((e) => MEAL_LABELS[e.meal_type]))].join(", ")}
                  </span>
                </h3>
                <FoodList records={entries.sort((a, b) => mealOrder(a) - mealOrder(b))} today={today} showDate={false} />
              </section>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Utensils className="size-5" />} title="No earlier entries" description={`Nothing logged before today in the last ${range} days.`} />
        )}
      </Card>
    </div>
  );
}
