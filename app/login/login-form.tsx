"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";

const initial: SignInState = { error: null, email: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className={inputClass}
          aria-invalid={Boolean(state.error) || undefined}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          aria-invalid={Boolean(state.error) || undefined}
        />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
