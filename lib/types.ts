// Row shapes for the tables in supabase/migrations. Dates are local
// calendar days as "YYYY-MM-DD" strings.

export type WaterUnit = "ml" | "l" | "fl_oz";
export type ThemePreference = "light" | "dark" | "system";
export type GoalMetric = "sleep" | "steps" | "water" | "meditation" | "workout";
export type ScheduleType = "daily" | "custom";
export type ActivityType = "football" | "walking" | "running" | "gym" | "cycling" | "other";
export type BodyUnits = "metric" | "imperial";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "drink";

export const GOAL_METRICS: GoalMetric[] = ["sleep", "steps", "water", "meditation", "workout"];
export const ACTIVITY_TYPES: ActivityType[] = ["football", "walking", "running", "gym", "cycling", "other"];
export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];

export type Profile = {
  id: string;
  display_name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  step_goal: number;
  sleep_goal_minutes: number;
  water_goal_ml: number;
  meditation_goal_minutes: number;
  water_unit: WaterUnit;
  water_increments_ml: number[];
  timezone: string | null;
  week_starts_on: 0 | 1;
  theme: ThemePreference;
  daily_goal_metrics: GoalMetric[];
  body_units: BodyUnits;
};

export type Habit = {
  id: string;
  name: string;
  icon: string | null;
  schedule_type: ScheduleType;
  schedule_days: number[];
  start_date: string;
  sort_order: number;
  created_at: string;
};

export type HabitCompletion = {
  id: string;
  habit_id: string;
  completed_on: string;
};

export type SleepRecord = {
  id: string;
  sleep_date: string;
  duration_minutes: number;
  quality: number | null;
  notes: string | null;
};

export type StepRecord = {
  id: string;
  record_date: string;
  steps: number;
};

export type WaterRecord = {
  id: string;
  record_date: string;
  amount_ml: number;
  created_at: string;
};

export type WorkoutRecord = {
  id: string;
  workout_date: string;
  activity_type: ActivityType;
  activity_label: string | null;
  duration_minutes: number | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
};

export type MeditationRecord = {
  id: string;
  session_date: string;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
};

export type FoodRecord = {
  id: string;
  entry_date: string;
  meal_type: MealType;
  description: string;
  notes: string | null;
  created_at: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export const DEFAULT_SETTINGS: Omit<UserSettings, "user_id"> = {
  step_goal: 10000,
  sleep_goal_minutes: 480,
  water_goal_ml: 2500,
  meditation_goal_minutes: 10,
  water_unit: "ml",
  water_increments_ml: [250, 500, 750],
  timezone: null,
  week_starts_on: 1,
  theme: "system",
  daily_goal_metrics: ["sleep", "steps", "water", "meditation"],
  body_units: "metric",
};
