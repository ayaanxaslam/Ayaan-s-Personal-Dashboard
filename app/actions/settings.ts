"use server";

import { cookies } from "next/headers";
import { check, runAction } from "@/lib/action-context";
import { isValidTimeZone } from "@/lib/dates";
import { THEME_COOKIE } from "@/lib/theme";
import { optionalInt, optionalText, requireInt, requireOneOf, ValidationError } from "@/lib/validation";
import {
  GOAL_METRICS,
  type ActionResult,
  type BodyUnits,
  type GoalMetric,
  type ThemePreference,
  type WaterUnit,
} from "@/lib/types";

export type SettingsInput = {
  displayName: string | null;
  /** About you — all optional, stored in metric. */
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyUnits: BodyUnits;
  stepGoal: number;
  sleepGoalMinutes: number;
  waterGoalMl: number;
  meditationGoalMinutes: number;
  waterUnit: WaterUnit;
  waterIncrementsMl: number[];
  timezone: string;
  weekStartsOn: 0 | 1;
  theme: ThemePreference;
  dailyGoalMetrics: GoalMetric[];
};

/** Optional number with one decimal place, within a range. */
function optionalMeasure(value: unknown, min: number, max: number, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) throw new ValidationError(`${label} must be a number.`);
  const rounded = Math.round(n * 10) / 10;
  if (rounded < min || rounded > max) throw new ValidationError(`${label} must be between ${min} and ${max}.`);
  return rounded;
}

async function setThemeCookie(theme: ThemePreference) {
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export async function saveSettings(input: SettingsInput): Promise<ActionResult> {
  return runAction(async ({ supabase, userId }) => {
    const theme = requireOneOf(input?.theme, ["light", "dark", "system"] as const, "Theme");
    if (typeof input.timezone !== "string" || !isValidTimeZone(input.timezone))
      throw new ValidationError("Choose a valid timezone.");
    if (!Array.isArray(input.waterIncrementsMl) || input.waterIncrementsMl.length < 1 || input.waterIncrementsMl.length > 6)
      throw new ValidationError("Add between one and six water amounts.");
    const increments = [...new Set(input.waterIncrementsMl.map((v) => requireInt(v, 1, 5000, "Water amount")))].sort(
      (a, b) => a - b,
    );
    if (!Array.isArray(input.dailyGoalMetrics)) throw new ValidationError("Daily goals are invalid.");
    const metrics = [...new Set(input.dailyGoalMetrics.map((m) => requireOneOf(m, GOAL_METRICS, "Daily goal")))];

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        step_goal: requireInt(input.stepGoal, 100, 100000, "Step goal"),
        sleep_goal_minutes: requireInt(input.sleepGoalMinutes, 60, 1080, "Sleep goal"),
        water_goal_ml: requireInt(input.waterGoalMl, 100, 10000, "Water goal"),
        meditation_goal_minutes: requireInt(input.meditationGoalMinutes, 1, 600, "Meditation goal"),
        water_unit: requireOneOf(input.waterUnit, ["ml", "l", "fl_oz"] as const, "Water unit"),
        water_increments_ml: increments,
        timezone: input.timezone,
        week_starts_on: requireInt(input.weekStartsOn, 0, 1, "Week start"),
        theme,
        daily_goal_metrics: metrics,
        body_units: requireOneOf(input.bodyUnits, ["metric", "imperial"] as const, "Units"),
      },
      { onConflict: "user_id" },
    );
    check(error);

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name: optionalText(input.displayName, 60, "Name"),
          age: optionalInt(input.age, 5, 120, "Age"),
          height_cm: optionalMeasure(input.heightCm, 50, 272, "Height (cm)"),
          weight_kg: optionalMeasure(input.weightKg, 10, 400, "Weight (kg)"),
        },
        { onConflict: "id" },
      );
    check(profileError);

    await setThemeCookie(theme);
  });
}

/** Called once by the browser to record its timezone when none is saved yet. */
export async function detectTimezone(timezone: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId }) => {
    if (typeof timezone !== "string" || !isValidTimeZone(timezone)) throw new ValidationError("Invalid timezone.");
    const { error } = await supabase
      .from("user_settings")
      .update({ timezone })
      .eq("user_id", userId)
      .is("timezone", null);
    check(error);
  });
}

/** Keeps the theme cookie in sync when the setting was changed on another device. */
export async function syncThemeCookie(theme: ThemePreference): Promise<void> {
  if (theme === "light" || theme === "dark" || theme === "system") await setThemeCookie(theme);
}
