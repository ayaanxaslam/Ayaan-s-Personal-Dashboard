"use server";

import { check, requireAffected, runAction, UserFacingError } from "@/lib/action-context";
import { HABIT_ICON_KEYS } from "@/lib/habit-icons";
import { requireDate, requireOneOf, requireText, requireUuid, ValidationError } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export type HabitInput = {
  name: string;
  icon: string | null;
  scheduleType: "daily" | "custom";
  scheduleDays: number[];
  startDate?: string;
};

function parseHabit(input: HabitInput, today: string) {
  const name = requireText(input?.name, 60, "Name");
  const icon = input.icon === null || input.icon === "" ? null : requireOneOf(input.icon, HABIT_ICON_KEYS, "Icon");
  const scheduleType = requireOneOf(input.scheduleType, ["daily", "custom"] as const, "Schedule");
  let scheduleDays = [0, 1, 2, 3, 4, 5, 6];
  if (scheduleType === "custom") {
    if (!Array.isArray(input.scheduleDays)) throw new ValidationError("Choose at least one day.");
    scheduleDays = [...new Set(input.scheduleDays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (scheduleDays.length === 0) throw new ValidationError("Choose at least one day.");
  }
  const startDate = input.startDate ? requireDate(input.startDate, today, "Start date") : undefined;
  return { name, icon, schedule_type: scheduleType, schedule_days: scheduleDays, start_date: startDate };
}

export async function createHabit(input: HabitInput): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const habit = parseHabit(input, today);
    const { data: last } = await supabase
      .from("habits")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("habits").insert({
      ...habit,
      start_date: habit.start_date ?? today,
      user_id: userId,
      sort_order: (last?.sort_order ?? -1) + 1,
    });
    check(error);
  });
}

export async function updateHabit(id: string, input: HabitInput): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const habitId = requireUuid(id, "Habit");
    const habit = parseHabit(input, today);
    const update: Record<string, unknown> = {
      name: habit.name,
      icon: habit.icon,
      schedule_type: habit.schedule_type,
      schedule_days: habit.schedule_days,
    };
    if (habit.start_date) update.start_date = habit.start_date;
    const { data, error } = await supabase.from("habits").update(update).eq("id", habitId).eq("user_id", userId).select("id");
    check(error);
    requireAffected(data);
  });
}

export async function deleteHabit(id: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId }) => {
    const habitId = requireUuid(id, "Habit");
    // Completions are removed by ON DELETE CASCADE.
    const { data, error } = await supabase.from("habits").delete().eq("id", habitId).eq("user_id", userId).select("id");
    check(error);
    requireAffected(data);
  });
}

/** Marks a habit done (or not done) for one local day. Idempotent. */
export async function setHabitCompletion(habitId: string, date: string, completed: boolean): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const id = requireUuid(habitId, "Habit");
    const day = requireDate(date, today);
    const { data: habit, error: habitError } = await supabase
      .from("habits")
      .select("id, start_date")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    check(habitError);
    if (!habit) throw new UserFacingError("That habit could not be found.");
    if (day < habit.start_date) throw new UserFacingError("That day is before this habit's start date.");

    if (completed) {
      // The unique (habit_id, completed_on) constraint prevents duplicates.
      const { error } = await supabase
        .from("habit_completions")
        .upsert(
          { habit_id: id, user_id: userId, completed_on: day },
          { onConflict: "habit_id,completed_on", ignoreDuplicates: true },
        );
      check(error);
    } else {
      const { error } = await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", id)
        .eq("user_id", userId)
        .eq("completed_on", day);
      check(error);
    }
  });
}
