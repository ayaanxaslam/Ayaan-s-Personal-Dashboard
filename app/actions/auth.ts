"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/env";

export type SignInState = { error: string | null; email: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 200);

  if (!getSupabaseEnv()) return { error: "Supabase is not configured yet. See README.md.", email };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", email };
  if (!password) return { error: "Enter your password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Deliberately vague: don't reveal whether the account exists.
    const message =
      error.status === 429
        ? "Too many attempts. Please wait a moment and try again."
        : "That email and password combination didn't work.";
    return { error: message, email };
  }
  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
