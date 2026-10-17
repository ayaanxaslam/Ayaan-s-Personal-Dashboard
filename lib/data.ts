import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type SessionUser } from "@/lib/auth";
import { addDays, dateInTimeZone, resolveTimeZone, todayInTimeZone } from "@/lib/dates";
import type { RecordSet } from "@/lib/metrics";
import {
  DEFAULT_SETTINGS,
  type FoodRecord,
  type Habit,
  type HabitCompletion,
  type MeditationRecord,
  type Profile,
  type SleepRecord,
  type StepRecord,
  type UserSettings,
  type WaterRecord,
  type WorkoutRecord,
} from "@/lib/types";

export const SETTINGS_COLUMNS =
  "user_id, step_goal, sleep_goal_minutes, water_goal_ml, meditation_goal_minutes, water_unit, water_increments_ml, timezone, week_starts_on, theme, daily_goal_metrics, body_units";
export const HABIT_COLUMNS = "id, name, icon, schedule_type, schedule_days, start_date, sort_order, created_at";

/** Loads the settings row, creating it with defaults if it is missing. */
export async function getSettings(supabase: SupabaseClient, userId: string): Promise<UserSettings> {
  const { data, error } = await supabase.from("user_settings").select(SETTINGS_COLUMNS).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  if (data) return data as UserSettings;

  const { data: created, error: insertError } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select(SETTINGS_COLUMNS)
    .single();
  if (insertError) return { user_id: userId, ...DEFAULT_SETTINGS };
  return created as UserSettings;
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, age, height_cm, weight_kg, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  // numeric columns can arrive as strings; normalise them.
  return { ...(data as Profile), age: num(data.age), height_cm: num(data.height_cm), weight_kg: num(data.weight_kg) };
}

export type UserContext = {
  supabase: SupabaseClient;
  user: SessionUser;
  settings: UserSettings;
  profile: Profile | null;
  timeZone: string;
  today: string;
  /** First local day that counts towards progress percentages. */
  trackingStart: string;
};

/** Everything a protected page needs about the signed-in user. Cached per request. */
export const getUserContext = cache(async (): Promise<UserContext> => {
  const user = await requireUser();
  const supabase = await createClient();
  const [settings, profile] = await Promise.all([getSettings(supabase, user.id), getProfile(supabase, user.id)]);
  const timeZone = resolveTimeZone(settings.timezone);
  const today = todayInTimeZone(timeZone);
  const trackingStart = profile ? dateInTimeZone(profile.created_at, timeZone) : addDays(today, -365);
  return { supabase, user, settings, profile, timeZone, today, trackingStart };
});

const PAGE = 1000;
const MAX_ROWS = 20000;

/** PostgREST caps responses (1,000 rows by default), so page through. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await build(offset, offset + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function getHabits(supabase: SupabaseClient, userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load habits: ${error.message}`);
  return (data ?? []) as Habit[];
}

type Datasets = {
  completions?: boolean;
  sleep?: boolean;
  steps?: boolean;
  water?: boolean;
  workouts?: boolean;
  meditation?: boolean;
  food?: boolean;
};

const ALL: Required<Datasets> = {
  completions: true,
  sleep: true,
  steps: true,
  water: true,
  workouts: true,
  meditation: true,
  food: true,
};

/**
 * Loads the user's records between two local dates (inclusive). Records
 * dated after `to` are never included, so future entries cannot leak
 * into past-day statistics.
 */
export async function loadRecords(
  supabase: SupabaseClient,
  userId: string,
  from: string,
  to: string,
  which: Datasets = ALL,
): Promise<RecordSet> {
  const none = Promise.resolve([]);
  const [habits, completions, sleep, steps, water, workouts, meditation, food] = await Promise.all([
    getHabits(supabase, userId),
    which.completions
      ? fetchAll<HabitCompletion>((a, b) =>
          supabase
            .from("habit_completions")
            .select("id, habit_id, completed_on")
            .eq("user_id", userId)
            .gte("completed_on", from)
            .lte("completed_on", to)
            .order("completed_on")
            .order("id")
            .range(a, b),
        )
      : none,
    which.sleep
      ? fetchAll<SleepRecord>((a, b) =>
          supabase
            .from("sleep_records")
            .select("id, sleep_date, duration_minutes, quality, notes")
            .eq("user_id", userId)
            .gte("sleep_date", from)
            .lte("sleep_date", to)
            .order("sleep_date")
            .range(a, b),
        )
      : none,
    which.steps
      ? fetchAll<StepRecord>((a, b) =>
          supabase
            .from("step_records")
            .select("id, record_date, steps")
            .eq("user_id", userId)
            .gte("record_date", from)
            .lte("record_date", to)
            .order("record_date")
            .range(a, b),
        )
      : none,
    which.water
      ? fetchAll<WaterRecord>((a, b) =>
          supabase
            .from("water_records")
            .select("id, record_date, amount_ml, created_at")
            .eq("user_id", userId)
            .gte("record_date", from)
            .lte("record_date", to)
            .order("record_date")
            .order("created_at")
            .range(a, b),
        )
      : none,
    which.workouts
      ? fetchAll<WorkoutRecord>((a, b) =>
          supabase
            .from("workout_records")
            .select("id, workout_date, activity_type, activity_label, duration_minutes, notes, completed, created_at")
            .eq("user_id", userId)
            .gte("workout_date", from)
            .lte("workout_date", to)
            .order("workout_date")
            .order("created_at")
            .range(a, b),
        )
      : none,
    which.meditation
      ? fetchAll<MeditationRecord>((a, b) =>
          supabase
            .from("meditation_records")
            .select("id, session_date, duration_minutes, notes, created_at")
            .eq("user_id", userId)
            .gte("session_date", from)
            .lte("session_date", to)
            .order("session_date")
            .order("created_at")
            .range(a, b),
        )
      : none,
    which.food
      ? fetchAll<FoodRecord>((a, b) =>
          supabase
            .from("food_records")
            .select("id, entry_date, meal_type, description, notes, created_at")
            .eq("user_id", userId)
            .gte("entry_date", from)
            .lte("entry_date", to)
            .order("entry_date")
            .order("created_at")
            .range(a, b),
        )
      : none,
  ]);
  return {
    habits,
    completions: completions as HabitCompletion[],
    sleep: sleep as SleepRecord[],
    steps: steps as StepRecord[],
    water: water as WaterRecord[],
    workouts: workouts as WorkoutRecord[],
    meditation: meditation as MeditationRecord[],
    food: food as FoodRecord[],
  };
}
