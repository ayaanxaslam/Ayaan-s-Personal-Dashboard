import { Database } from "lucide-react";
import type { SetupProblem } from "@/lib/setup";

export function SetupNeeded({ problem }: { problem: SetupProblem }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl bg-surface p-7 shadow-card">
        <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden>
          <Database className="size-5" />
        </span>
        <h1 className="text-lg font-bold text-ink">{problem.title}</h1>
        <p className="mt-2 text-sm text-ink-2">{problem.detail}</p>
        {problem.file ? (
          <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
            <li>Open your project at supabase.com → SQL Editor → New query.</li>
            <li>
              Paste the whole of <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">supabase/migrations/{problem.file}</code>{" "}
              from the GitHub repo.
            </li>
            <li>Press Run, then reload this page.</li>
          </ol>
        ) : null}
        <p className="mt-5 text-xs text-ink-3">Nothing is saved until this is fixed, so the app is paused to avoid losing entries.</p>
      </div>
    </div>
  );
}
