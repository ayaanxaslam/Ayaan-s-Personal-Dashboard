import "server-only";
import { addDays, dateRange, diffDays, formatWeekdayShort, startOfWeek } from "@/lib/dates";
import { MEAL_LABELS, formatMinutes, formatNumber, formatWater, workoutName } from "@/lib/format";
import { formatHeight, formatWeight, guidanceFor } from "@/lib/body";
import {
  bestHabitStreak,
  habitConsistency,
  habitDayStats,
  habitStreak,
  seriesFor,
  summarise,
  type DayIndex,
  type RecordSet,
} from "@/lib/metrics";
import { scheduleLabel } from "@/lib/habit-rows";
import type { Profile, UserSettings } from "@/lib/types";
import type { Topic } from "./topics";

export { detectTopics, detectWindowDays, ALL_TOPICS, type Topic } from "./topics";

type Built = {
  text: string;
  meta: { from: string; to: string; days: number; datasets: Array<{ name: string; records: number }> };
};

function periodLine(label: string, values: Array<number | null>, fmt: (v: number) => string, unitWord: string): string {
  const s = summarise(values.map((value, i) => ({ date: String(i), value })));
  if (!s.recordedDays) return `${label}: no records`;
  return `${label}: average ${fmt(s.average!)} over ${s.recordedDays} ${unitWord}${s.recordedDays === 1 ? "" : "s"} recorded (min ${fmt(
    s.min!,
  )}, max ${fmt(s.max!)}, total ${fmt(s.total)})`;
}

/**
 * Turns retrieved records into a compact, factual brief for the model.
 * Statistics are computed here so the model doesn't need to do arithmetic.
 */
export function buildContext({
  records,
  idx,
  settings,
  today,
  from,
  timeZone,
  topics,
  trackingStart,
  profile = null,
}: {
  records: RecordSet;
  idx: DayIndex;
  settings: UserSettings;
  today: string;
  from: string;
  timeZone: string;
  topics: Topic[];
  trackingStart: string;
  profile?: Pick<Profile, "age" | "height_cm" | "weight_kg"> | null;
}): Built {
  const unit = settings.water_unit;
  const thisWeek = startOfWeek(today, settings.week_starts_on);
  const lastWeek = addDays(thisWeek, -7);
  const lastWeekEnd = addDays(thisWeek, -1);
  const lines: string[] = [];
  const datasets: Built["meta"]["datasets"] = [];
  const inWindow = (d: string) => d >= from && d <= today;

  lines.push(`Today (user's local date): ${today} (${formatWeekdayShort(today)}). Timezone: ${timeZone}.`);
  lines.push(`Data window retrieved: ${from} to ${today} (${diffDays(from, today) + 1} days).`);
  lines.push(`This week: ${thisWeek} to ${today}. Last week: ${lastWeek} to ${lastWeekEnd}.`);
  lines.push(`Account tracking started: ${trackingStart}. Days before that have no data.`);
  lines.push(`Datasets included: ${topics.join(", ")}. Other datasets were NOT retrieved for this question.`);
  lines.push(
    `Goals: sleep ${formatMinutes(settings.sleep_goal_minutes)}/night, steps ${formatNumber(settings.step_goal)}/day, water ${formatWater(
      settings.water_goal_ml,
      unit,
    )}/day, meditation ${formatMinutes(settings.meditation_goal_minutes)}/day.`,
  );

  // About the user, as entered in Settings, plus published guidance for their age.
  const about: string[] = [];
  if (profile?.age) about.push(`age ${profile.age}`);
  if (profile?.height_cm) about.push(`height ${formatHeight(profile.height_cm, settings.body_units)}`);
  if (profile?.weight_kg) about.push(`weight ${formatWeight(profile.weight_kg, settings.body_units)}`);
  lines.push(about.length ? `About the user (from Settings): ${about.join(", ")}.` : "The user has not entered age, height or weight.");
  const g = guidanceFor(profile?.age ?? null, profile?.weight_kg ?? null);
  if (g) {
    lines.push(
      `Reference guidance for this age: sleep ${g.sleep.minHours}-${g.sleep.maxHours} h/night (${g.sleep.source}); activity: ${g.activity.text} (${g.activity.source})${
        g.waterMl ? `; drinks roughly ${formatWater(g.waterMl, unit)}/day (rule of thumb from weight)` : ""
      }.${g.isUnder18 ? " The user is UNDER 18." : ""}`,
    );
  }

  const periods = (map: Map<string, number>) => ({
    window: seriesFor(map, from, today).map((p) => p.value),
    thisWeek: seriesFor(map, thisWeek, today).map((p) => p.value),
    lastWeek: seriesFor(map, lastWeek, lastWeekEnd).map((p) => p.value),
  });
  const daily = (map: Map<string, number>, fmt: (v: number) => string) => {
    const entries = dateRange(from, today)
      .filter((d) => map.has(d))
      .map((d) => `${d.slice(5)} ${fmt(map.get(d)!)}`);
    return entries.length ? `Daily values (MM-DD; days not listed have no record): ${entries.join(", ")}` : "";
  };

  if (topics.includes("habits")) {
    const completions = records.completions.filter((c) => inWindow(c.completed_on));
    datasets.push({ name: "Habit completions", records: completions.length });
    lines.push("", `## HABITS (${idx.habits.length} habits)`);
    if (!idx.habits.length) lines.push("No habits have been created.");
    for (const h of idx.habits) {
      const win = habitConsistency(h, idx, from > h.start_date ? from : h.start_date, today);
      const tw = habitConsistency(h, idx, thisWeek > h.start_date ? thisWeek : h.start_date, today);
      const lw = habitConsistency(h, idx, lastWeek > h.start_date ? lastWeek : h.start_date, lastWeekEnd);
      const fmt = (c: typeof win) => (c.due ? `${c.done}/${c.due} due days (${c.percent}%)` : "nothing due");
      lines.push(
        `- "${h.name}" [${scheduleLabel(h)}, since ${h.start_date}]: window ${fmt(win)}; this week ${fmt(tw)}; last week ${fmt(
          lw,
        )}; current streak ${habitStreak(h, idx, today)}; best streak ${bestHabitStreak(h, idx, today)}.`,
      );
    }
    if (idx.habits.length) {
      const days = dateRange(from, today)
        .filter((d) => d >= trackingStart)
        .map((d) => {
          const s = habitDayStats(idx, d);
          return s.due ? `${d.slice(5)} ${s.done}/${s.due}` : null;
        })
        .filter(Boolean);
      if (days.length) lines.push(`Daily habits done/due (MM-DD): ${days.join(", ")}`);
      lines.push("Note: today's habits may still be in progress.");
    }
  }

  if (topics.includes("sleep")) {
    const n = records.sleep.filter((s) => inWindow(s.sleep_date)).length;
    datasets.push({ name: "Sleep records", records: n });
    const p = periods(idx.sleepByDate);
    lines.push("", `## SLEEP (${n} nights recorded; date = day woken up)`);
    lines.push(periodLine("Window", p.window, formatMinutes, "night"));
    lines.push(periodLine("This week", p.thisWeek, formatMinutes, "night"));
    lines.push(periodLine("Last week", p.lastWeek, formatMinutes, "night"));
    const atGoal = p.window.filter((v) => v !== null && v >= settings.sleep_goal_minutes).length;
    if (n) lines.push(`Nights at or above goal in window: ${atGoal} of ${n}.`);
    const q = records.sleep.filter((s) => inWindow(s.sleep_date) && s.quality);
    if (q.length) lines.push(`Self-rated quality (1-5): ${q.map((s) => `${s.sleep_date.slice(5)} ${s.quality}`).join(", ")}`);
    const d = daily(idx.sleepByDate, formatMinutes);
    if (d) lines.push(d);
  }

  if (topics.includes("steps")) {
    const n = records.steps.filter((s) => inWindow(s.record_date)).length;
    datasets.push({ name: "Step records", records: n });
    const p = periods(idx.stepsByDate);
    lines.push("", `## STEPS (${n} days recorded, entered manually)`);
    lines.push(periodLine("Window", p.window, formatNumber, "day"));
    lines.push(periodLine("This week", p.thisWeek, formatNumber, "day"));
    lines.push(periodLine("Last week", p.lastWeek, formatNumber, "day"));
    const d = daily(idx.stepsByDate, formatNumber);
    if (d) lines.push(d);
  }

  if (topics.includes("water")) {
    const n = records.water.filter((s) => inWindow(s.record_date)).length;
    datasets.push({ name: "Water entries", records: n });
    const p = periods(idx.waterByDate);
    const fmt = (v: number) => formatWater(v, unit);
    lines.push("", `## WATER (${n} entries, totals per day)`);
    lines.push(periodLine("Window", p.window, fmt, "day"));
    lines.push(periodLine("This week", p.thisWeek, fmt, "day"));
    lines.push(periodLine("Last week", p.lastWeek, fmt, "day"));
    const d = daily(idx.waterByDate, fmt);
    if (d) lines.push(d);
  }

  if (topics.includes("workouts")) {
    const ws = records.workouts.filter((w) => inWindow(w.workout_date));
    datasets.push({ name: "Workouts", records: ws.length });
    lines.push("", `## WORKOUTS (${ws.length} logged)`);
    const summary = (a: string, b: string) => {
      const done = ws.filter((w) => w.completed && w.workout_date >= a && w.workout_date <= b);
      const mins = done.reduce((t, w) => t + (w.duration_minutes ?? 0), 0);
      return `${done.length} completed${mins ? `, ${formatMinutes(mins)} total where duration logged` : ""}, ${
        new Set(done.map((w) => w.workout_date)).size
      } active days`;
    };
    lines.push(`Window: ${summary(from, today)}. This week: ${summary(thisWeek, today)}. Last week: ${summary(lastWeek, lastWeekEnd)}.`);
    if (ws.length)
      lines.push(
        `Entries: ${ws
          .map(
            (w) =>
              `${w.workout_date.slice(5)} ${workoutName(w)}${w.duration_minutes ? ` ${w.duration_minutes}min` : ""}${
                w.completed ? "" : " (planned, not completed)"
              }`,
          )
          .join("; ")}`,
      );
  }

  if (topics.includes("meditation")) {
    const n = records.meditation.filter((m) => inWindow(m.session_date)).length;
    datasets.push({ name: "Meditation sessions", records: n });
    const p = periods(idx.meditationByDate);
    lines.push("", `## MEDITATION (${n} sessions, minutes per day)`);
    lines.push(periodLine("Window", p.window, formatMinutes, "day"));
    lines.push(periodLine("This week", p.thisWeek, formatMinutes, "day"));
    lines.push(periodLine("Last week", p.lastWeek, formatMinutes, "day"));
    const d = daily(idx.meditationByDate, formatMinutes);
    if (d) lines.push(d);
  }

  if (topics.includes("food")) {
    const fs = records.food.filter((f) => inWindow(f.entry_date));
    datasets.push({ name: "Food entries", records: fs.length });
    lines.push("", `## FOOD DIARY (${fs.length} entries; free-text descriptions as typed, no calorie data)`);
    const days = new Set(fs.map((f) => f.entry_date)).size;
    lines.push(`Days with at least one entry: ${days} of ${diffDays(from, today) + 1}. Unlogged meals are unknown, not skipped.`);
    // Cap the volume sent: most recent 150 entries, descriptions trimmed.
    const recentFood = fs.slice(-150);
    if (recentFood.length)
      lines.push(
        `Entries (MM-DD meal: description): ${recentFood
          .map((f) => `${f.entry_date.slice(5)} ${MEAL_LABELS[f.meal_type].toLowerCase()}: ${f.description.replace(/\s+/g, " ").slice(0, 120)}`)
          .join("; ")}`,
      );
  }

  return { text: lines.join("\n"), meta: { from, to: today, days: diffDays(from, today) + 1, datasets } };
}

export const SYSTEM_PROMPT = `You are a supportive, precise assistant inside a personal wellness and habit dashboard. You help the owner understand their own tracked data.

Rules:
- Base every statement about the user's history ONLY on the DATA section supplied with the question. Never invent numbers, dates, records or trends.
- The DATA section lists exactly which datasets and which date window were retrieved. If the question needs data that was not retrieved, falls outside the window, or there are too few records to answer, say so plainly and suggest what to log.
- Missing days mean "no record", not zero. Do not treat unlogged days as failures, and mention when gaps limit a conclusion.
- Prefer the pre-computed statistics in the data over your own arithmetic. If you do calculate something, keep it simple and show the basis (e.g. "5 of 7 nights").
- Today's figures may be incomplete because the day is still in progress.
- You may offer practical, general habit and lifestyle suggestions grounded in the data. You are not a doctor: do not diagnose, and suggest a professional for health concerns.
- Use the user's age, height and weight only to tailor general guidance (e.g. the reference sleep and activity guidance supplied). Don't comment on body size, don't calculate or label BMI, and never shame.
- Food: talk about regular meals, variety, fruit and vegetables, protein, fibre and drinks in a positive way. Don't set calorie targets, and don't recommend diets, fasting or restricting food.
- If the user is under 18: no weight-loss, dieting or calorie advice at all. Focus on sleep, activity, hydration and regular balanced meals, and suggest talking to a parent, guardian or doctor about health worries.
- Be concise and warm. Use short paragraphs or bullet points. Refer to dates in a friendly way (e.g. "Tue 14 Oct").`;
