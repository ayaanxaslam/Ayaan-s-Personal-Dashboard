// Pure calculations shared by the dashboard, insights page and AI route.
// Everything here works on records that were actually loaded — missing
// days stay missing (null), they are never treated as zero.

import { addDays, dateRange, diffDays, weekday } from "./dates";
import type {
  FoodRecord,
  GoalMetric,
  Habit,
  HabitCompletion,
  MeditationRecord,
  SleepRecord,
  StepRecord,
  UserSettings,
  WaterRecord,
  WorkoutRecord,
} from "./types";

export type RecordSet = {
  habits: Habit[];
  completions: HabitCompletion[];
  sleep: SleepRecord[];
  steps: StepRecord[];
  water: WaterRecord[];
  workouts: WorkoutRecord[];
  meditation: MeditationRecord[];
  food: FoodRecord[];
};

export type DayIndex = {
  habits: Habit[];
  completed: Set<string>; // `${habitId}|${date}`
  completionsByHabit: Map<string, Set<string>>;
  sleepByDate: Map<string, number>; // minutes
  stepsByDate: Map<string, number>;
  waterByDate: Map<string, number>; // total ml
  meditationByDate: Map<string, number>; // total minutes
  workoutMinutesByDate: Map<string, number>;
  workoutsDoneByDate: Map<string, number>; // completed workouts
  mealsByDate: Map<string, number>; // food entries
};

function addTo(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

export function buildIndex(r: RecordSet): DayIndex {
  const idx: DayIndex = {
    habits: r.habits,
    completed: new Set(),
    completionsByHabit: new Map(),
    sleepByDate: new Map(),
    stepsByDate: new Map(),
    waterByDate: new Map(),
    meditationByDate: new Map(),
    workoutMinutesByDate: new Map(),
    workoutsDoneByDate: new Map(),
    mealsByDate: new Map(),
  };
  for (const c of r.completions) {
    idx.completed.add(`${c.habit_id}|${c.completed_on}`);
    let s = idx.completionsByHabit.get(c.habit_id);
    if (!s) idx.completionsByHabit.set(c.habit_id, (s = new Set()));
    s.add(c.completed_on);
  }
  for (const s of r.sleep) idx.sleepByDate.set(s.sleep_date, s.duration_minutes);
  for (const s of r.steps) idx.stepsByDate.set(s.record_date, s.steps);
  for (const w of r.water) addTo(idx.waterByDate, w.record_date, w.amount_ml);
  for (const m of r.meditation) addTo(idx.meditationByDate, m.session_date, m.duration_minutes);
  for (const f of r.food ?? []) addTo(idx.mealsByDate, f.entry_date, 1);
  for (const w of r.workouts) {
    if (!w.completed) continue;
    addTo(idx.workoutsDoneByDate, w.workout_date, 1);
    if (w.duration_minutes) addTo(idx.workoutMinutesByDate, w.workout_date, w.duration_minutes);
  }
  return idx;
}

// ---------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------

export function isScheduledOn(habit: Habit, date: string): boolean {
  if (date < habit.start_date) return false;
  if (habit.schedule_type === "daily") return true;
  return habit.schedule_days.includes(weekday(date));
}

export function habitsDueOn(habits: Habit[], date: string): Habit[] {
  return habits.filter((h) => isScheduledOn(h, date));
}

export function isCompleted(idx: DayIndex, habitId: string, date: string): boolean {
  return idx.completed.has(`${habitId}|${date}`);
}

/** Habits due and done on a day. Completions on unscheduled days do not count. */
export function habitDayStats(idx: DayIndex, date: string): { due: number; done: number } {
  const due = habitsDueOn(idx.habits, date);
  return { due: due.length, done: due.filter((h) => isCompleted(idx, h.id, date)).length };
}

const MAX_STREAK_SCAN = 3650;

/**
 * Consecutive scheduled days completed, ending today. If today is due but
 * not done yet, the streak is still alive and counts from yesterday.
 */
export function habitStreak(habit: Habit, idx: DayIndex, today: string): number {
  const done = idx.completionsByHabit.get(habit.id) ?? new Set<string>();
  let day = today;
  if (isScheduledOn(habit, today) && !done.has(today)) day = addDays(today, -1);
  let streak = 0;
  for (let i = 0; i < MAX_STREAK_SCAN && day >= habit.start_date; i++, day = addDays(day, -1)) {
    if (!isScheduledOn(habit, day)) continue;
    if (done.has(day)) streak++;
    else break;
  }
  return streak;
}

export function bestHabitStreak(habit: Habit, idx: DayIndex, today: string): number {
  const done = idx.completionsByHabit.get(habit.id) ?? new Set<string>();
  let best = 0;
  let run = 0;
  const from = habit.start_date > addDays(today, -MAX_STREAK_SCAN) ? habit.start_date : addDays(today, -MAX_STREAK_SCAN);
  for (const day of dateRange(from, today)) {
    if (!isScheduledOn(habit, day)) continue;
    if (done.has(day)) best = Math.max(best, ++run);
    else if (day !== today) run = 0;
  }
  return best;
}

/** Share of scheduled days completed between two dates (inclusive). */
export function habitConsistency(
  habit: Habit,
  idx: DayIndex,
  from: string,
  to: string,
): { due: number; done: number; percent: number | null } {
  let due = 0;
  let done = 0;
  for (const day of dateRange(from, to)) {
    if (!isScheduledOn(habit, day)) continue;
    due++;
    if (isCompleted(idx, habit.id, day)) done++;
  }
  return { due, done, percent: due ? Math.round((done / due) * 100) : null };
}

/**
 * Consecutive days on which every scheduled habit was completed. Days with
 * nothing scheduled are skipped; an unfinished today does not break it.
 */
export function perfectDayStreak(idx: DayIndex, today: string, trackingStart: string): number {
  if (idx.habits.length === 0) return 0;
  let day = today;
  const t = habitDayStats(idx, today);
  if (t.due > 0 && t.done < t.due) day = addDays(today, -1);
  let streak = 0;
  for (let i = 0; i < MAX_STREAK_SCAN && day >= trackingStart; i++, day = addDays(day, -1)) {
    const s = habitDayStats(idx, day);
    if (s.due === 0) continue;
    if (s.done === s.due) streak++;
    else break;
  }
  return streak;
}

// ---------------------------------------------------------------------
// Daily goals ("Goals reached today")
// ---------------------------------------------------------------------

export type GoalItem = {
  key: string;
  label: string;
  kind: "habit" | GoalMetric;
  reached: boolean;
};

export type DayGoals = {
  items: GoalItem[];
  reached: number;
  total: number;
  /** null when nothing was due or the day is before tracking started. */
  percent: number | null;
};

type GoalSettings = Pick<
  UserSettings,
  "daily_goal_metrics" | "sleep_goal_minutes" | "step_goal" | "water_goal_ml" | "meditation_goal_minutes"
>;

export function dayGoals(idx: DayIndex, date: string, settings: GoalSettings, trackingStart: string): DayGoals {
  if (date < trackingStart) return { items: [], reached: 0, total: 0, percent: null };
  const items: GoalItem[] = habitsDueOn(idx.habits, date).map((h) => ({
    key: `habit:${h.id}`,
    label: h.name,
    kind: "habit",
    reached: isCompleted(idx, h.id, date),
  }));
  const metrics = settings.daily_goal_metrics;
  if (metrics.includes("sleep"))
    items.push({ key: "sleep", label: "Sleep goal", kind: "sleep", reached: (idx.sleepByDate.get(date) ?? 0) >= settings.sleep_goal_minutes });
  if (metrics.includes("steps"))
    items.push({ key: "steps", label: "Step goal", kind: "steps", reached: (idx.stepsByDate.get(date) ?? 0) >= settings.step_goal });
  if (metrics.includes("water"))
    items.push({ key: "water", label: "Water goal", kind: "water", reached: (idx.waterByDate.get(date) ?? 0) >= settings.water_goal_ml });
  if (metrics.includes("meditation"))
    items.push({
      key: "meditation",
      label: "Meditation goal",
      kind: "meditation",
      reached: (idx.meditationByDate.get(date) ?? 0) >= settings.meditation_goal_minutes,
    });
  if (metrics.includes("workout"))
    items.push({ key: "workout", label: "Workout", kind: "workout", reached: (idx.workoutsDoneByDate.get(date) ?? 0) > 0 });

  const reached = items.filter((i) => i.reached).length;
  return {
    items,
    reached,
    total: items.length,
    percent: items.length ? Math.round((reached / items.length) * 100) : null,
  };
}

// ---------------------------------------------------------------------
// Series helpers for charts and summaries
// ---------------------------------------------------------------------

export type SeriesPoint = { date: string; value: number | null };

export function seriesFor(map: Map<string, number>, from: string, to: string): SeriesPoint[] {
  return dateRange(from, to).map((date) => ({ date, value: map.has(date) ? map.get(date)! : null }));
}

/** Average over recorded days only. */
export function summarise(points: SeriesPoint[]): {
  recordedDays: number;
  average: number | null;
  total: number;
  min: number | null;
  max: number | null;
} {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (!values.length) return { recordedDays: 0, average: null, total: 0, min: null, max: null };
  const total = values.reduce((a, b) => a + b, 0);
  return {
    recordedDays: values.length,
    average: total / values.length,
    total,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function daysBetweenInclusive(from: string, to: string): number {
  return diffDays(from, to) + 1;
}
