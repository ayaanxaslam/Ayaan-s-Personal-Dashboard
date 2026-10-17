import type { Metadata } from "next";
import Link from "next/link";
import { Brain, CircleCheckBig, Droplet, Dumbbell, Flame, Footprints, ListChecks, Moon, Percent, Settings } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays, dateRange, formatLongDate, formatWeekdayShort, formatRelativeDay, greetingFor } from "@/lib/dates";
import { buildIndex, dayGoals, habitDayStats, habitStreak, habitsDueOn, isCompleted, perfectDayStreak, seriesFor, summarise } from "@/lib/metrics";
import { formatMinutes, formatNumber, formatWater } from "@/lib/format";
import { Card, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DotGauge } from "@/components/charts/dot-gauge";
import { HabitChecklist } from "@/components/habits/habit-checklist";
import { NewHabitButton } from "@/components/trackers/dialog-buttons";
import { FoodCard, MeditationCard, SleepCard, StepsCard, SummaryTile, TipsCard, WaterCard, WorkoutCard } from "@/components/dashboard/cards";
import { buildTips } from "@/lib/tips";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { supabase, user, settings, profile, timeZone, today, trackingStart } = await getUserContext();
  const weekFrom = addDays(today, -6);
  const yesterday = addDays(today, -1);

  const [recent, history] = await Promise.all([
    loadRecords(supabase, user.id, weekFrom, today, { sleep: true, steps: true, water: true, workouts: true, meditation: true, food: true }),
    // Completions for a year back, for streaks.
    loadRecords(supabase, user.id, addDays(today, -366), today, { completions: true }),
  ]);
  const idx = buildIndex({ ...recent, completions: history.completions });

  const goalsToday = dayGoals(idx, today, settings, trackingStart);
  const goalsYesterday = dayGoals(idx, yesterday, settings, trackingStart);
  const habitsToday = habitDayStats(idx, today);
  const habitPct = habitsToday.due ? Math.round((habitsToday.done / habitsToday.due) * 100) : null;
  const streak = perfectDayStreak(idx, today, trackingStart);

  const sleepToday = recent.sleep.find((s) => s.sleep_date === today) ?? null;
  const stepsToday = recent.steps.find((s) => s.record_date === today) ?? null;
  const waterEntriesToday = recent.water.filter((w) => w.record_date === today);
  const waterToday = idx.waterByDate.get(today) ?? 0;
  const workoutsToday = recent.workouts.filter((w) => w.workout_date === today);
  const meditationToday = idx.meditationByDate.get(today) ?? 0;
  const meditationSessions = recent.meditation.filter((m) => m.session_date === today).length;
  const sleepSummary = summarise(seriesFor(idx.sleepByDate, weekFrom, today));
  const weekWorkouts = recent.workouts.filter((w) => w.completed);
  const weekWorkoutMinutes = weekWorkouts.reduce((a, w) => a + (w.duration_minutes ?? 0), 0);

  const foodToday = recent.food.filter((f) => f.entry_date === today);
  const tips = buildTips({
    age: profile?.age ?? null,
    heightCm: profile?.height_cm ?? null,
    weightKg: profile?.weight_kg ?? null,
    sleepAverage: sleepSummary.average,
    sleepNights: sleepSummary.recordedDays,
    activeMinutes7: weekWorkoutMinutes,
    stepsToday: stepsToday?.steps ?? null,
    waterGoalMl: settings.water_goal_ml,
    waterUnit: settings.water_unit,
    mealsToday: foodToday.length,
  });

  const due = habitsDueOn(idx.habits, today);
  const name = profile?.display_name?.trim();

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink-3">{formatLongDate(today)}</p>
          <h1 className="mt-0.5 text-[22px] leading-tight font-bold tracking-tight text-ink sm:text-[28px]">
            {greetingFor(timeZone)}
            {name ? `, ${name}` : ""}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-surface px-3 text-sm font-bold text-ink shadow-card sm:px-3.5"
            title="Consecutive days with every scheduled habit completed"
          >
            <Flame className="size-4 text-warning" aria-hidden />
            <span className="tabular">{streak}</span>
            <span className="text-xs font-semibold whitespace-nowrap text-ink-3">
              <span className="sm:hidden">{streak === 1 ? "day" : "days"}</span>
              <span className="hidden sm:inline">day streak</span>
            </span>
          </div>
          <Link
            href="/settings"
            className="grid size-10 place-items-center rounded-2xl bg-surface text-ink-2 shadow-card transition hover:text-ink"
            aria-label="Settings"
          >
            <Settings className="size-[18px]" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Daily progress */}
        <Card className="flex flex-col">
          <Eyebrow className="text-center">Goals reached today</Eyebrow>
          <div className="mt-4">
            <DotGauge
              percent={goalsToday.percent}
              label={
                goalsToday.percent === null
                  ? "No goals due today"
                  : `${goalsToday.percent} percent of today's goals reached`
              }
            />
          </div>
          <p className="mt-3 text-center text-sm text-ink-2">
            {goalsToday.total
              ? `${goalsToday.reached} of ${goalsToday.total} goals reached`
              : "Add a habit or enable tracker goals in Settings to see progress."}
          </p>
          <div className="mt-5 flex items-center justify-center gap-6 border-t border-line pt-4 text-center">
            <div>
              <p className="tabular text-lg font-bold text-ink">{goalsYesterday.percent === null ? "—" : `${goalsYesterday.percent}%`}</p>
              <p className="text-[11px] text-ink-3">Yesterday</p>
            </div>
            <div className="h-8 w-px bg-line" aria-hidden />
            <div>
              <p className="tabular text-lg font-bold text-ink">
                {habitsToday.done}/{habitsToday.due}
              </p>
              <p className="text-[11px] text-ink-3">Habits today</p>
            </div>
          </div>
          {goalsToday.items.length ? (
            <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Today's goals">
              {goalsToday.items.map((g) => (
                <li
                  key={g.key}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    g.reached ? "bg-mint-soft text-ink" : "bg-surface-2 text-ink-3"
                  }`}
                >
                  {g.reached ? "✓ " : ""}
                  {g.label}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        {/* Today's summary */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Today&apos;s summary</h2>
            <span className="text-xs text-ink-3">{formatRelativeDay(today, today)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
            <SummaryTile icon={<CircleCheckBig className="size-3.5" />} label="Habits done" value={habitsToday.done} />
            <SummaryTile icon={<ListChecks className="size-3.5" />} label="Due today" value={habitsToday.due} />
            <SummaryTile icon={<Percent className="size-3.5" />} label="Habit rate" value={habitPct === null ? "—" : `${habitPct}%`} />
            <SummaryTile
              icon={<Moon className="size-3.5" />}
              label="Sleep"
              value={sleepToday ? formatMinutes(sleepToday.duration_minutes) : "—"}
              sub={sleepToday ? undefined : "Not logged"}
            />
            <SummaryTile
              icon={<Footprints className="size-3.5" />}
              label="Steps"
              value={stepsToday ? formatNumber(stepsToday.steps) : "—"}
              sub={stepsToday ? undefined : "Not logged"}
            />
            <SummaryTile
              icon={<Droplet className="size-3.5" />}
              label="Water"
              value={waterEntriesToday.length ? formatWater(waterToday, settings.water_unit) : "—"}
              sub={waterEntriesToday.length ? undefined : "Not logged"}
            />
            <SummaryTile
              icon={<Dumbbell className="size-3.5" />}
              label="Workout"
              value={workoutsToday.some((w) => w.completed) ? "Done" : workoutsToday.length ? "Planned" : "—"}
              sub={workoutsToday.length ? undefined : "Not logged"}
            />
            <SummaryTile
              icon={<Brain className="size-3.5" />}
              label="Meditation"
              value={meditationToday ? formatMinutes(meditationToday) : "—"}
              sub={meditationToday ? undefined : "Not logged"}
            />
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Today&apos;s habits</h3>
              <Link href="/habits" className="text-xs font-semibold text-accent-strong hover:underline">
                Manage
              </Link>
            </div>
            {idx.habits.length === 0 ? (
              <EmptyState
                compact
                title="No habits yet"
                description="Create habits you want to build — they'll appear here each day."
                action={
                  <NewHabitButton today={today} label="New habit" title="New habit" size="sm" variant="soft" />
                }
              />
            ) : due.length === 0 ? (
              <EmptyState compact title="Nothing scheduled today" description="Enjoy the rest day." />
            ) : (
              <HabitChecklist
                date={today}
                habits={due.map((h) => ({
                  id: h.id,
                  name: h.name,
                  icon: h.icon,
                  done: isCompleted(idx, h.id, today),
                  streak: habitStreak(h, idx, today),
                }))}
              />
            )}
          </div>
        </Card>
      </div>

      {/* Trackers */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:row-span-2">
          <SleepCard
            today={today}
            settings={settings}
            todayRecord={sleepToday}
            average={sleepSummary.average}
            recordedNights={sleepSummary.recordedDays}
            week={dateRange(weekFrom, today).map((date) => ({
              date,
              label: formatWeekdayShort(date).slice(0, 2),
              title: formatRelativeDay(date, today),
              minutes: idx.sleepByDate.get(date) ?? null,
              isToday: date === today,
            }))}
          />
        </div>
        <StepsCard today={today} settings={settings} todayRecord={stepsToday} week={recent.steps} heightCm={profile?.height_cm ?? null} />
        <WaterCard today={today} settings={settings} totalMl={waterToday} entries={waterEntriesToday} />
        <WorkoutCard today={today} workouts={workoutsToday} weekCount={weekWorkouts.length} weekMinutes={weekWorkoutMinutes} />
        <MeditationCard today={today} settings={settings} minutes={meditationToday} sessions={meditationSessions} />
        <div className="md:col-span-2">
          <TipsCard tips={tips} />
        </div>
        <FoodCard today={today} entries={foodToday} />
      </div>
    </div>
  );
}
