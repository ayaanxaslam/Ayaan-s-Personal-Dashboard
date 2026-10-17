import { addDays, dateRange, formatRelativeDay, formatWeekdayNarrow, WEEKDAY_LABELS } from "./dates";
import { bestHabitStreak, habitConsistency, habitStreak, isCompleted, isScheduledOn, type DayIndex } from "./metrics";
import type { Habit } from "./types";

export function scheduleLabel(h: Habit): string {
  if (h.schedule_type === "daily" || h.schedule_days.length === 7) return "Every day";
  const d = [...h.schedule_days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (d.join() === "1,2,3,4,5") return "Weekdays";
  if (d.join() === "6,0") return "Weekends";
  return d.map((x) => WEEKDAY_LABELS[x]).join(", ");
}

/** Builds the per-habit view model for the Habits page (server side). */
export function buildHabitRows(idx: DayIndex, today: string, days = 30) {
  const from = addDays(today, -(days - 1));
  const range = dateRange(from, today);
  return idx.habits.map((habit) => {
    const c = habitConsistency(habit, idx, from > habit.start_date ? from : habit.start_date, today);
    return {
      habit,
      scheduleLabel: scheduleLabel(habit),
      streak: habitStreak(habit, idx, today),
      best: bestHabitStreak(habit, idx, today),
      consistency: c.percent,
      consistencyDetail: c.due ? `${c.done} of ${c.due} scheduled days` : "Nothing scheduled yet",
      cells: range.map((date) => {
        const state: "done" | "missed" | "off" | "before" =
          date < habit.start_date
            ? "before"
            : isCompleted(idx, habit.id, date)
              ? "done"
              : isScheduledOn(habit, date)
                ? "missed"
                : "off";
        return {
          date,
          state,
          isToday: date === today,
          title: formatRelativeDay(date, today),
          weekdayLetter: formatWeekdayNarrow(date),
        };
      }),
    };
  });
}
