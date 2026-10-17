import "server-only";
import { refresh } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { resolveTimeZone, todayInTimeZone } from "@/lib/dates";
import { ValidationError } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export type ActionContext = {
  supabase: SupabaseClient;
  userId: string;
  today: string;
};

class AuthError extends Error {}

/** Re-verifies the session inside every action rather than trusting the client. */
async function getActionContext(): Promise<ActionContext> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Your session has expired. Please sign in again.");
  const supabase = await createClient();
  const { data } = await supabase.from("user_settings").select("timezone").eq("user_id", user.id).maybeSingle();
  const today = todayInTimeZone(resolveTimeZone(data?.timezone ?? null));
  return { supabase, userId: user.id, today };
}

/**
 * Runs a mutation with an authenticated context, converts failures into a
 * friendly result and refreshes the client router so every page shows the
 * saved data without a reload.
 */
export async function runAction(fn: (ctx: ActionContext) => Promise<void>): Promise<ActionResult> {
  try {
    const ctx = await getActionContext();
    await fn(ctx);
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof ValidationError || err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof UserFacingError) return { ok: false, error: err.message };
    console.error("Action failed:", err instanceof Error ? err.message : "unknown error");
    return { ok: false, error: "Something went wrong while saving. Please try again." };
  }
}

/** A database/logic error whose message is safe to show. */
export class UserFacingError extends Error {}

/** Throws on a Supabase error, mapping common constraint failures to readable text. */
export function check(error: { code?: string; message: string } | null, duplicateMessage?: string) {
  if (!error) return;
  if (error.code === "23505") throw new UserFacingError(duplicateMessage ?? "That record already exists.");
  if (error.code === "23514") throw new UserFacingError("One of the values is outside the allowed range.");
  if (error.code === "42501") throw new UserFacingError("You don't have permission to change that record.");
  throw new Error(error.message);
}

/** Ensures an update/delete actually touched a row the user owns. */
export function requireAffected(rows: unknown[] | null) {
  if (!rows || rows.length === 0) throw new UserFacingError("That record could not be found.");
}
