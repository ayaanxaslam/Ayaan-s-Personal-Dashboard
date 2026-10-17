"use client";

import { useOptimistic, useTransition } from "react";
import { Check, Flame } from "lucide-react";
import { setHabitCompletion } from "@/app/actions/habits";
import { useToast } from "@/components/ui/toast";
import { habitIcon } from "@/lib/habit-icons";
import { cn } from "@/lib/cn";

export type ChecklistHabit = {
  id: string;
  name: string;
  icon: string | null;
  done: boolean;
  streak: number;
};

/** Today's due habits with instant (optimistic) check/uncheck. */
export function HabitChecklist({ habits, date, compact }: { habits: ChecklistHabit[]; date: string; compact?: boolean }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    habits,
    (state, update: { id: string; done: boolean }) => state.map((h) => (h.id === update.id ? { ...h, done: update.done } : h)),
  );

  function toggle(h: ChecklistHabit) {
    const done = !h.done;
    startTransition(async () => {
      setOptimistic({ id: h.id, done });
      try {
        const r = await setHabitCompletion(h.id, date, done);
        if (!r.ok) toast.error(r.error);
      } catch {
        toast.error("Couldn't reach the server. Your change wasn't saved.");
      }
    });
  }

  return (
    <ul className={cn("grid gap-2", compact ? "" : "sm:grid-cols-2")}>
      {optimistic.map((h) => {
        const Icon = habitIcon(h.icon);
        return (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => toggle(h)}
              aria-pressed={h.done}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                h.done ? "bg-mint-soft" : "bg-surface-2 hover:bg-surface-3",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl transition",
                  h.done ? "bg-surface text-mint" : "bg-surface text-ink-3",
                )}
                aria-hidden
              >
                <Icon className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-semibold", h.done ? "text-ink" : "text-ink")}>{h.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-ink-3">
                  {h.streak > 0 ? (
                    <>
                      <Flame className="size-3" aria-hidden /> {h.streak} day{h.streak === 1 ? "" : "s"}
                    </>
                  ) : (
                    "No streak yet"
                  )}
                </span>
              </span>
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full transition",
                  h.done ? "bg-mint text-white" : "ring-2 ring-line ring-inset group-hover:ring-ink-3/40",
                )}
                aria-hidden
              >
                {h.done ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <span className="sr-only">{h.done ? "Completed. Press to undo." : "Not completed. Press to mark done."}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
