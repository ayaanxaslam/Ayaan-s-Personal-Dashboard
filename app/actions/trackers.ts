"use server";

import { check, requireAffected, runAction } from "@/lib/action-context";
import {
  optionalInt,
  optionalText,
  requireBool,
  requireDate,
  requireInt,
  requireOneOf,
  requireText,
  requireUuid,
  ValidationError,
} from "@/lib/validation";
import { ACTIVITY_TYPES, MEAL_TYPES, type ActionResult, type ActivityType, type MealType } from "@/lib/types";

// ---------------------------------------------------------------------
// Sleep — one record per local day (the day you woke up)
// ---------------------------------------------------------------------

export type SleepInput = { date: string; durationMinutes: number; quality: number | null; notes: string | null };

export async function saveSleep(input: SleepInput, id?: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const row = {
      user_id: userId,
      sleep_date: requireDate(input?.date, today),
      duration_minutes: requireInt(input.durationMinutes, 1, 1440, "Sleep duration"),
      quality: optionalInt(input.quality, 1, 5, "Quality"),
      notes: optionalText(input.notes, 500, "Notes"),
    };
    if (id) {
      const { data, error } = await supabase
        .from("sleep_records")
        .update(row)
        .eq("id", requireUuid(id))
        .eq("user_id", userId)
        .select("id");
      check(error, "There is already a sleep record for that date.");
      requireAffected(data);
    } else {
      // Saving a new entry for a date that already has one replaces it.
      const { error } = await supabase.from("sleep_records").upsert(row, { onConflict: "user_id,sleep_date" });
      check(error);
    }
  });
}

export async function deleteSleep(id: string): Promise<ActionResult> {
  return deleteOwned("sleep_records", id);
}

// ---------------------------------------------------------------------
// Steps — one record per local day
// ---------------------------------------------------------------------

export async function saveSteps(input: { date: string; steps: number }, id?: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const row = {
      user_id: userId,
      record_date: requireDate(input?.date, today),
      steps: requireInt(input.steps, 0, 200000, "Steps"),
    };
    if (id) {
      const { data, error } = await supabase
        .from("step_records")
        .update(row)
        .eq("id", requireUuid(id))
        .eq("user_id", userId)
        .select("id");
      check(error, "There is already a step record for that date.");
      requireAffected(data);
    } else {
      const { error } = await supabase.from("step_records").upsert(row, { onConflict: "user_id,record_date" });
      check(error);
    }
  });
}

export async function deleteSteps(id: string): Promise<ActionResult> {
  return deleteOwned("step_records", id);
}

// ---------------------------------------------------------------------
// Water — many entries per day, stored in millilitres
// ---------------------------------------------------------------------

export async function addWater(input: { date: string; amountMl: number }): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const { error } = await supabase.from("water_records").insert({
      user_id: userId,
      record_date: requireDate(input?.date, today),
      amount_ml: requireInt(input.amountMl, 1, 5000, "Amount"),
    });
    check(error);
  });
}

export async function updateWater(id: string, input: { date: string; amountMl: number }): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const { data, error } = await supabase
      .from("water_records")
      .update({
        record_date: requireDate(input?.date, today),
        amount_ml: requireInt(input.amountMl, 1, 5000, "Amount"),
      })
      .eq("id", requireUuid(id))
      .eq("user_id", userId)
      .select("id");
    check(error);
    requireAffected(data);
  });
}

export async function deleteWater(id: string): Promise<ActionResult> {
  return deleteOwned("water_records", id);
}

// ---------------------------------------------------------------------
// Workouts — many per day
// ---------------------------------------------------------------------

export type WorkoutInput = {
  date: string;
  activityType: ActivityType;
  activityLabel: string | null;
  durationMinutes: number | null;
  notes: string | null;
  completed: boolean;
};

function parseWorkout(input: WorkoutInput, today: string) {
  const activityType = requireOneOf(input?.activityType, ACTIVITY_TYPES, "Activity");
  const activityLabel = activityType === "other" ? optionalText(input.activityLabel, 60, "Activity name") : null;
  return {
    workout_date: requireDate(input.date, today),
    activity_type: activityType,
    activity_label: activityLabel,
    duration_minutes: optionalInt(input.durationMinutes, 1, 1440, "Duration"),
    notes: optionalText(input.notes, 1000, "Notes"),
    completed: requireBool(input.completed, "Completion status"),
  };
}

export async function saveWorkout(input: WorkoutInput, id?: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const row = parseWorkout(input, today);
    if (id) {
      const { data, error } = await supabase
        .from("workout_records")
        .update(row)
        .eq("id", requireUuid(id))
        .eq("user_id", userId)
        .select("id");
      check(error);
      requireAffected(data);
    } else {
      const { error } = await supabase.from("workout_records").insert({ ...row, user_id: userId });
      check(error);
    }
  });
}

export async function setWorkoutCompleted(id: string, completed: boolean): Promise<ActionResult> {
  return runAction(async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from("workout_records")
      .update({ completed: requireBool(completed, "Completion status") })
      .eq("id", requireUuid(id))
      .eq("user_id", userId)
      .select("id");
    check(error);
    requireAffected(data);
  });
}

export async function deleteWorkout(id: string): Promise<ActionResult> {
  return deleteOwned("workout_records", id);
}

// ---------------------------------------------------------------------
// Meditation — many sessions per day
// ---------------------------------------------------------------------

export type MeditationInput = { date: string; durationMinutes: number; notes: string | null };

export async function saveMeditation(input: MeditationInput, id?: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const row = {
      session_date: requireDate(input?.date, today),
      duration_minutes: requireInt(input.durationMinutes, 1, 600, "Duration"),
      notes: optionalText(input.notes, 500, "Notes"),
    };
    if (id) {
      const { data, error } = await supabase
        .from("meditation_records")
        .update(row)
        .eq("id", requireUuid(id))
        .eq("user_id", userId)
        .select("id");
      check(error);
      requireAffected(data);
    } else {
      const { error } = await supabase.from("meditation_records").insert({ ...row, user_id: userId });
      check(error);
    }
  });
}

export async function deleteMeditation(id: string): Promise<ActionResult> {
  return deleteOwned("meditation_records", id);
}

// ---------------------------------------------------------------------
// Food diary — many entries per day
// ---------------------------------------------------------------------

export type FoodInput = { date: string; mealType: MealType; description: string; notes: string | null };

export async function saveFood(input: FoodInput, id?: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId, today }) => {
    const row = {
      entry_date: requireDate(input?.date, today),
      meal_type: requireOneOf(input.mealType, MEAL_TYPES, "Meal"),
      description: requireText(input.description, 300, "What you ate"),
      notes: optionalText(input.notes, 500, "Notes"),
    };
    if (id) {
      const { data, error } = await supabase
        .from("food_records")
        .update(row)
        .eq("id", requireUuid(id))
        .eq("user_id", userId)
        .select("id");
      check(error);
      requireAffected(data);
    } else {
      const { error } = await supabase.from("food_records").insert({ ...row, user_id: userId });
      check(error);
    }
  });
}

export async function deleteFood(id: string): Promise<ActionResult> {
  return deleteOwned("food_records", id);
}

// ---------------------------------------------------------------------

type OwnedTable =
  | "sleep_records"
  | "step_records"
  | "water_records"
  | "workout_records"
  | "meditation_records"
  | "food_records";

async function deleteOwned(table: OwnedTable, id: string): Promise<ActionResult> {
  return runAction(async ({ supabase, userId }) => {
    if (typeof id !== "string") throw new ValidationError("Record not found.");
    const { data, error } = await supabase.from(table).delete().eq("id", requireUuid(id)).eq("user_id", userId).select("id");
    check(error);
    requireAffected(data);
  });
}
