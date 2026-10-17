import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SetupProblem = { title: string; detail: string; file?: string };

const MISSING_TABLE = new Set(["PGRST205", "42P01"]);
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);

/**
 * Confirms the database has been set up, so data can actually be saved.
 * Returns a problem to show instead of the app, or null when all is well.
 */
export async function checkDatabase(supabase: SupabaseClient): Promise<SetupProblem | null> {
  const [settings, profileCols, food] = await Promise.all([
    supabase.from("user_settings").select("user_id").limit(1),
    supabase.from("profiles").select("age").limit(1),
    supabase.from("food_records").select("id").limit(1),
  ]);

  const first = settings.error;
  if (first && MISSING_TABLE.has(first.code ?? ""))
    return {
      title: "The database tables haven't been created yet",
      detail: "Run both migration files in the Supabase SQL Editor, in order.",
      file: "20261016000000_initial_schema.sql",
    };
  if (first?.code === "42501")
    return {
      title: "The app doesn't have permission to read your data",
      detail: "Re-run the first migration in the Supabase SQL Editor; it sets the permissions and security policies.",
      file: "20261016000000_initial_schema.sql",
    };
  const second = profileCols.error ?? food.error;
  if (second && (MISSING_TABLE.has(second.code ?? "") || MISSING_COLUMN.has(second.code ?? "")))
    return {
      title: "One database update still needs to be applied",
      detail: "The food diary and About you need the second migration. Run it in the Supabase SQL Editor.",
      file: "20261017000000_profile_details_and_food.sql",
    };
  if (first || second)
    return {
      title: "Couldn't reach your database",
      detail: "Check that the Supabase URL and anon key in your environment variables belong to the same project, then redeploy.",
    };
  return null;
}
