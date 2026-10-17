import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dateRange, diffDays, startOfWeek, todayInTimeZone, weekday } from "../lib/dates";
import {
  bestHabitStreak,
  buildIndex,
  dayGoals,
  habitConsistency,
  habitDayStats,
  habitStreak,
  perfectDayStreak,
  seriesFor,
  summarise,
  type RecordSet,
} from "../lib/metrics";
import { formatMinutes, formatWater, mlToUnit, unitToMl } from "../lib/format";
import { detectTopics, detectWindowDays } from "../lib/ai/topics";
import { cmToFeetInches, feetInchesToCm, guidanceFor, kgToLb, lbToKg, stepsToKm } from "../lib/body";
import { buildTips } from "../lib/tips";
import type { Habit, UserSettings } from "../lib/types";

const habit = (id: string, extra: Partial<Habit> = {}): Habit => ({
  id,
  name: id,
  icon: null,
  schedule_type: "daily",
  schedule_days: [0, 1, 2, 3, 4, 5, 6],
  start_date: "2026-10-01",
  sort_order: 0,
  created_at: "2026-10-01T00:00:00Z",
  ...extra,
});

const empty: RecordSet = { habits: [], completions: [], sleep: [], steps: [], water: [], workouts: [], meditation: [], food: [] };
const done = (habit_id: string, ...dates: string[]) => dates.map((d, i) => ({ id: `${habit_id}-${i}`, habit_id, completed_on: d }));

const settings: Pick<
  UserSettings,
  "daily_goal_metrics" | "sleep_goal_minutes" | "step_goal" | "water_goal_ml" | "meditation_goal_minutes"
> = {
  daily_goal_metrics: ["sleep", "steps", "water", "meditation"],
  sleep_goal_minutes: 480,
  step_goal: 10000,
  water_goal_ml: 2000,
  meditation_goal_minutes: 10,
};

test("dates: arithmetic is DST-safe and inclusive", () => {
  assert.equal(addDays("2026-03-28", 2), "2026-03-30"); // across UK DST change
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(diffDays("2026-10-01", "2026-10-17"), 16);
  assert.equal(dateRange("2026-10-15", "2026-10-17").length, 3);
  assert.equal(weekday("2026-10-17"), 6); // Saturday
  assert.equal(startOfWeek("2026-10-17", 1), "2026-10-12");
  assert.equal(startOfWeek("2026-10-17", 0), "2026-10-11");
});

test("dates: 'today' follows the user's timezone, not the server's", () => {
  const instant = new Date("2026-10-16T23:30:00Z");
  assert.equal(todayInTimeZone("UTC", instant), "2026-10-16");
  assert.equal(todayInTimeZone("Europe/London", instant), "2026-10-17"); // BST, already the next day
  assert.equal(todayInTimeZone("America/New_York", instant), "2026-10-16");
});

test("habit streak: unfinished today doesn't break it; a miss does", () => {
  const h = habit("read");
  const idx = buildIndex({ ...empty, habits: [h], completions: done("read", "2026-10-14", "2026-10-15", "2026-10-16") });
  assert.equal(habitStreak(h, idx, "2026-10-17"), 3); // today pending
  const idx2 = buildIndex({ ...empty, habits: [h], completions: done("read", "2026-10-14", "2026-10-16", "2026-10-17") });
  assert.equal(habitStreak(h, idx2, "2026-10-17"), 2); // missed the 15th
  assert.equal(bestHabitStreak(h, idx2, "2026-10-17"), 2);
});

test("habit streak: unscheduled days are skipped, not counted as misses", () => {
  // Weekdays only. 2026-10-16 is a Friday, 17/18 the weekend.
  const h = habit("study", { schedule_type: "custom", schedule_days: [1, 2, 3, 4, 5] });
  const idx = buildIndex({ ...empty, habits: [h], completions: done("study", "2026-10-15", "2026-10-16") });
  assert.equal(habitStreak(h, idx, "2026-10-18"), 2);
  const c = habitConsistency(h, idx, "2026-10-12", "2026-10-18");
  assert.deepEqual(c, { due: 5, done: 2, percent: 40 });
});

test("habits: days before start date and completions on unscheduled days don't count", () => {
  const h = habit("new", { start_date: "2026-10-17" });
  const idx = buildIndex({ ...empty, habits: [h], completions: done("new", "2026-10-16") });
  assert.deepEqual(habitDayStats(idx, "2026-10-16"), { due: 0, done: 0 });
  assert.equal(habitStreak(h, idx, "2026-10-17"), 0);
});

test("perfect-day streak requires every due habit", () => {
  const a = habit("a");
  const b = habit("b");
  const idx = buildIndex({
    ...empty,
    habits: [a, b],
    completions: [...done("a", "2026-10-15", "2026-10-16"), ...done("b", "2026-10-16")],
  });
  assert.equal(perfectDayStreak(idx, "2026-10-17", "2026-10-01"), 1);
});

test("daily goals combine habits with tracker goals and ignore pre-tracking days", () => {
  const h = habit("read");
  const idx = buildIndex({
    ...empty,
    habits: [h],
    completions: done("read", "2026-10-17"),
    sleep: [{ id: "s", sleep_date: "2026-10-17", duration_minutes: 490, quality: null, notes: null }],
    steps: [{ id: "st", record_date: "2026-10-17", steps: 4000 }],
    water: [
      { id: "w1", record_date: "2026-10-17", amount_ml: 1500, created_at: "" },
      { id: "w2", record_date: "2026-10-17", amount_ml: 500, created_at: "" },
    ],
  });
  const g = dayGoals(idx, "2026-10-17", settings, "2026-10-01");
  // read ✓, sleep ✓, steps ✗, water ✓ (1500+500), meditation ✗
  assert.equal(g.total, 5);
  assert.equal(g.reached, 3);
  assert.equal(g.percent, 60);
  assert.equal(dayGoals(idx, "2026-09-30", settings, "2026-10-01").percent, null);
  assert.equal(dayGoals(buildIndex(empty), "2026-10-17", { ...settings, daily_goal_metrics: [] }, "2026-10-01").percent, null);
});

test("averages only use recorded days; missing days stay null", () => {
  const idx = buildIndex({
    ...empty,
    steps: [
      { id: "1", record_date: "2026-10-15", steps: 8000 },
      { id: "2", record_date: "2026-10-17", steps: 12000 },
    ],
  });
  const series = seriesFor(idx.stepsByDate, "2026-10-11", "2026-10-17");
  assert.equal(series.filter((p) => p.value === null).length, 5);
  const s = summarise(series);
  assert.equal(s.recordedDays, 2);
  assert.equal(s.average, 10000);
  assert.equal(summarise(seriesFor(new Map(), "2026-10-11", "2026-10-17")).average, null);
});

test("planned (not completed) workouts don't count", () => {
  const idx = buildIndex({
    ...empty,
    workouts: [
      { id: "1", workout_date: "2026-10-17", activity_type: "gym", activity_label: null, duration_minutes: 45, notes: null, completed: false, created_at: "" },
    ],
  });
  assert.equal(idx.workoutsDoneByDate.get("2026-10-17"), undefined);
});

test("format: units round-trip and render sensibly", () => {
  assert.equal(formatMinutes(455), "7h 35m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatWater(750, "ml"), "750 ml");
  assert.equal(formatWater(2500, "ml"), "2.5 L");
  assert.equal(formatWater(2000, "l"), "2 L");
  assert.equal(unitToMl(mlToUnit(500, "fl_oz"), "fl_oz"), 500);
});

test("AI: retrieves only the datasets a question needs", () => {
  assert.deepEqual(detectTopics("How has my recorded sleep changed?"), ["sleep"]);
  assert.deepEqual(detectTopics("Summarise my workout activity."), ["workouts"]);
  assert.deepEqual(detectTopics("Which habits have I completed most consistently?"), ["habits"]);
  assert.equal(detectTopics("Summarise my progress this week.").length, 7);
  assert.equal(detectTopics("Compare this week with last week.").length, 7);
  assert.deepEqual(detectTopics("What do my meals look like this week?"), ["food"]);
  assert.deepEqual(detectTopics("Is my sleep right for my age?"), ["sleep"]);
  assert.equal(detectWindowDays("Compare this week with last week."), 14);
  assert.equal(detectWindowDays("How did I do this month?"), 35);
  assert.equal(detectWindowDays("all time best streak"), 90);
});

test("body: unit conversions round-trip", () => {
  assert.deepEqual(cmToFeetInches(175), { feet: 5, inches: 9 });
  assert.equal(Math.round(feetInchesToCm(5, 9)), 175);
  assert.equal(Math.round(lbToKg(kgToLb(65))), 65);
  assert.equal(stepsToKm(10000, 175).toFixed(1), "7.3");
});

test("body: guidance follows published age bands", () => {
  assert.equal(guidanceFor(null, 60), null);
  const teen = guidanceFor(16, 60)!;
  assert.deepEqual([teen.sleep.minHours, teen.sleep.maxHours], [8, 10]);
  assert.equal(teen.isUnder18, true);
  assert.equal(teen.activity.weeklyMinutes, 420);
  assert.equal(teen.waterMl, 2000); // 60 kg × 33 ml, rounded
  const adult = guidanceFor(30, null)!;
  assert.deepEqual([adult.sleep.minHours, adult.sleep.maxHours], [7, 9]);
  assert.equal(adult.activity.weeklyMinutes, 150);
  assert.equal(adult.waterMl, null);
  assert.deepEqual([guidanceFor(10, null)!.sleep.minHours, guidanceFor(70, null)!.sleep.maxHours], [9, 8]);
});

test("tips: personalised from real data, and honest when data is missing", () => {
  const base = {
    age: 16,
    heightCm: 175,
    weightKg: 60,
    sleepAverage: 420,
    sleepNights: 5,
    activeMinutes7: 90,
    stepsToday: 8000,
    waterGoalMl: 2500,
    waterUnit: "ml" as const,
    mealsToday: 2,
  };
  const tips = buildTips(base);
  assert.equal(tips.find((t) => t.kind === "sleep")?.tone, "nudge"); // 7h < 8h minimum at 16
  assert.match(tips.find((t) => t.kind === "sleep")!.text, /7h over 5 nights; 8–10 hours/);
  assert.equal(tips.find((t) => t.kind === "activity")?.tone, "nudge"); // 90 < 420 min
  assert.ok(tips.some((t) => t.kind === "water")); // 2.5 L goal vs ~2 L guide
  assert.equal(buildTips({ ...base, sleepNights: 2 }).find((t) => t.kind === "sleep")?.tone, "info");
  assert.equal(buildTips({ ...base, sleepAverage: 540, activeMinutes7: 450 }).find((t) => t.kind === "sleep")?.tone, "good");
  const none = buildTips({ ...base, age: null, heightCm: null, weightKg: null });
  assert.deepEqual(none.map((t) => t.kind), ["profile"]);
  assert.ok(buildTips(base).length <= 4);
});
