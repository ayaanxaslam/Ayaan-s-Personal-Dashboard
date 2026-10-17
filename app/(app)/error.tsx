"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-3xl bg-surface p-8 text-center shadow-card">
      <span className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger" aria-hidden>
        <AlertTriangle className="size-5" />
      </span>
      <h1 className="text-lg font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-3">
        Your data couldn&apos;t be loaded. If this keeps happening, check that the database migration has been applied and
        your Supabase environment variables are correct.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-ink-3">Reference: {error.digest}</p> : null}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
