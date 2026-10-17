import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Brain, Droplet, Dumbbell, Footprints, Moon, Utensils } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { buildIndex, seriesFor, summarise } from "@/lib/metrics";
import { formatMinutes, formatNumber, formatWater, pct } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { SegmentedBar } from "@/components/charts/segmented-bar";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityOverviewPage() {
  const { supabase, user, settings, today } = await getUserContext();
  const from = addDays(today, -6);
  const records = await loadRecords(supabase, user.id, from, today, {
    sleep: true,
    steps: true,
    water: true,
    workouts: true,
    meditation: true,
    food: true,
  });
  const idx = buildIndex(records);
  const unit = settings.water_unit;

  const sleep = idx.sleepByDate.get(today);
  const steps = idx.stepsByDate.get(today);
  const water = idx.waterByDate.get(today);
  const meditation = idx.meditationByDate.get(today);
  const workoutsDone = records.workouts.filter((w) => w.workout_date === today && w.completed).length;
  const weekWorkouts = records.workouts.filter((w) => w.completed).length;
  const mealsToday = records.food.filter((f) => f.entry_date === today).length;
  const mealDays = new Set(records.food.map((f) => f.entry_date)).size;

  const avg = (m: Map<string, number>) => summarise(seriesFor(m, from, today));

  const tiles = [
    {
      href: "/activity/sleep",
      title: "Sleep",
      icon: Moon,
      value: sleep !== undefined ? formatMinutes(sleep) : "Not logged",
      progress: sleep !== undefined ? pct(sleep, settings.sleep_goal_minutes) : 0,
      goal: `Goal ${formatMinutes(settings.sleep_goal_minutes)}`,
      week: avg(idx.sleepByDate),
      fmt: (v: number) => formatMinutes(v),
    },
    {
      href: "/activity/steps",
      title: "Steps",
      icon: Footprints,
      value: steps !== undefined ? formatNumber(steps) : "Not logged",
      progress: steps !== undefined ? pct(steps, settings.step_goal) : 0,
      goal: `Goal ${formatNumber(settings.step_goal)}`,
      week: avg(idx.stepsByDate),
      fmt: (v: number) => formatNumber(v),
    },
    {
      href: "/activity/water",
      title: "Water",
      icon: Droplet,
      value: water !== undefined ? formatWater(water, unit) : "Not logged",
      progress: water !== undefined ? pct(water, settings.water_goal_ml) : 0,
      goal: `Goal ${formatWater(settings.water_goal_ml, unit)}`,
      week: avg(idx.waterByDate),
      fmt: (v: number) => formatWater(v, unit),
    },
    {
      href: "/activity/meditation",
      title: "Meditation",
      icon: Brain,
      value: meditation !== undefined ? formatMinutes(meditation) : "Not logged",
      progress: meditation !== undefined ? pct(meditation, settings.meditation_goal_minutes) : 0,
      goal: `Goal ${formatMinutes(settings.meditation_goal_minutes)}`,
      week: avg(idx.meditationByDate),
      fmt: (v: number) => formatMinutes(v),
    },
  ];

  return (
    <div className="animate-fade-up grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="group rounded-3xl focus-visible:outline-offset-4">
          <Card as="div" className="h-full transition group-hover:shadow-float">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden>
                  <t.icon className="size-[18px]" />
                </span>
                <span className="text-[15px] font-semibold text-ink">{t.title}</span>
              </span>
              <ArrowUpRight className="size-4 text-ink-3 transition group-hover:text-ink" aria-hidden />
            </div>
            <p className="tabular text-2xl font-bold tracking-tight text-ink">{t.value}</p>
            <p className="mb-3 text-xs text-ink-3">Today · {t.goal}</p>
            <SegmentedBar value={t.progress} segments={10} label={`${t.title} towards today's goal`} />
            <p className="mt-3 text-xs text-ink-3">
              {t.week.average !== null
                ? `7-day average ${t.fmt(t.week.average)} (${t.week.recordedDays} ${t.week.recordedDays === 1 ? "day" : "days"} logged)`
                : "Nothing logged in the last 7 days"}
            </p>
          </Card>
        </Link>
      ))}
      <Link href="/activity/workouts" className="group rounded-3xl focus-visible:outline-offset-4">
        <Card as="div" className="h-full transition group-hover:shadow-float">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden>
                <Dumbbell className="size-[18px]" />
              </span>
              <span className="text-[15px] font-semibold text-ink">Workouts</span>
            </span>
            <ArrowUpRight className="size-4 text-ink-3 transition group-hover:text-ink" aria-hidden />
          </div>
          <p className="tabular text-2xl font-bold tracking-tight text-ink">
            {workoutsDone ? `${workoutsDone} done` : "None today"}
          </p>
          <p className="text-xs text-ink-3">
            {weekWorkouts} completed in the last 7 days
          </p>
        </Card>
      </Link>
      <Link href="/activity/food" className="group rounded-3xl focus-visible:outline-offset-4">
        <Card as="div" className="h-full transition group-hover:shadow-float">
          <div className="mb-4 flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden>
                <Utensils className="size-[18px]" />
              </span>
              <span className="text-[15px] font-semibold text-ink">Food</span>
            </span>
            <ArrowUpRight className="size-4 text-ink-3 transition group-hover:text-ink" aria-hidden />
          </div>
          <p className="tabular text-2xl font-bold tracking-tight text-ink">
            {mealsToday ? `${mealsToday} ${mealsToday === 1 ? "entry" : "entries"}` : "Not logged"}
          </p>
          <p className="text-xs text-ink-3">Logged on {mealDays} of the last 7 days</p>
        </Card>
      </Link>
    </div>
  );
}
