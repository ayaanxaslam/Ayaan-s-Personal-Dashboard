import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";

export type SessionUser = { id: string; email: string | null };

/**
 * Verifies the session JWT (getClaims validates the signature) and returns
 * a narrow user object, or null when signed out. Cached per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: sub, email };
});

/** For pages: redirect to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
