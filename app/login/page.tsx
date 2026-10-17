import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/env";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/nav/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const configured = Boolean(getSupabaseEnv());
  if (configured && (await getSessionUser())) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={44} />
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-3">Sign in to your wellness dashboard.</p>
        </div>
        <div className="rounded-3xl bg-surface p-6 shadow-card">
          {configured ? (
            <LoginForm />
          ) : (
            <div className="space-y-3 text-sm text-ink-2">
              <p className="font-semibold text-ink">Supabase isn&apos;t configured yet</p>
              <p>
                Add <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">.env.local</code>, then restart the dev
                server. The README walks through every step.
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-ink-3">Private dashboard · accounts are created in Supabase</p>
      </div>
    </div>
  );
}
