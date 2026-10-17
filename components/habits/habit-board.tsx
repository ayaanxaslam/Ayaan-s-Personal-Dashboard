"use client";

import { useOptimistic, useTransition } from "react";
import { Flame, Pencil, Trash2, Trophy } from "lucide-react";
import { deleteHabit, setHabitCompletion } from "@/app/actions/habits";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DialogButton } from "@/components/trackers/forms";
import { useToast } from "@/components/ui/toast";
import { habitIcon } from "@/lib/habit-icons";
import { cn } from "@/lib/cn";
import type { Habit } from "@/lib/types";
import { HabitForm } from "./habit-form";

export type HabitCell = {
  date: string;
  /** done | missed | off (not scheduled) | before (before start date) */
  state: "done" | "missed" | "off" | "before";
  isToday: boolean;
  title: string;
  weekdayLetter: string;
};

export type HabitRow = {
  habit: Habit;
  scheduleLabel: string;
  streak: number;
  best: number;
  consistency: number | null;
  consistencyDetail: string;
  cells: HabitCell[];
};

function HabitHistory({ row }: { row: HabitRow }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [cells, setCell] = useOptimistic(row.cells, (state, u: { date: string; done: boolean }) =>
    state.map((c) => (c.date === u.date ? { ...c, state: u.done ? ("done" as const) : ("missed" as const) } : c)),
  );

  function toggle(c: HabitCell) {
    if (c.state === "before") return;
    const done = c.state !== "done";
    startTransition(async () => {
      setCell({ date: c.date, done });
      try {
        const r = await setHabitCompletion(row.habit.id, c.date, done);
        if (!r.ok) toast.error(r.error);
      } catch {
        toast.error("Couldn't reach the server. Your change wasn't saved.");
      }
    });
  }

  return (
    <div className="flex gap-[3px]" role="group" aria-label={`${row.habit.name} — last ${cells.length} days`}>
      {cells.map((c) => (
        <button
          key={c.date}
          type="button"
          disabled={c.state === "before"}
          onClick={() => toggle(c)}
          title={c.title}
          aria-label={`${c.title}: ${
            c.state === "done" ? "completed" : c.state === "missed" ? "not completed" : c.state === "off" ? "not scheduled" : "before start"
          }`}
          aria-pressed={c.state === "done"}
          className={cn(
            "relative h-7 min-w-0 flex-1 rounded-[5px] transition hover:brightness-95 disabled:cursor-default",
            c.state === "done" && "bg-accent",
            c.state === "missed" && "bg-track",
            c.state === "off" && "bg-surface-2 ring-1 ring-line ring-inset",
            c.state === "before" && "bg-transparent ring-1 ring-line/60 ring-inset",
            c.isToday && "outline-2 outline-offset-1 outline-ink/30",
          )}
        />
      ))}
    </div>
  );
}

export function HabitBoard({ rows, today }: { rows: HabitRow[]; today: string }) {
  const first = rows[0]?.cells ?? [];
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const Icon = habitIcon(row.habit.icon);
        return (
          <article key={row.habit.id} className="rounded-3xl bg-surface p-4 shadow-card sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-strong" aria-hidden>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold text-ink">{row.habit.name}</h3>
                <p className="text-xs text-ink-3">{row.scheduleLabel}</p>
              </div>
              <div className="flex items-center">
                <DialogButton
                  label={<span className="sr-only">Edit {row.habit.name}</span>}
                  title="Edit habit"
                  variant="ghost"
                  size="icon"
                  icon={<Pencil className="size-4" aria-hidden />}
                >
                  {(close) => <HabitForm habit={row.habit} today={today} onDone={close} />}
                </DialogButton>
                <ConfirmButton
                  action={() => deleteHabit(row.habit.id)}
                  title={`Delete “${row.habit.name}”?`}
                  description="This deletes the habit and its entire completion history. It can't be undone."
                  successMessage="Habit deleted"
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.habit.name}`}
                  className="hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </ConfirmButton>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <Stat icon={<Flame className="size-3.5" aria-hidden />} label="Current streak" value={`${row.streak}d`} />
              <Stat icon={<Trophy className="size-3.5" aria-hidden />} label="Best streak" value={`${row.best}d`} />
              <Stat label="Last 30 days" value={row.consistency === null ? "—" : `${row.consistency}%`} hint={row.consistencyDetail} />
            </div>

            <HabitHistory row={row} />
          </article>
        );
      })}
      {first.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-accent" aria-hidden /> Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-track" aria-hidden /> Not done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-surface-2 ring-1 ring-line ring-inset" aria-hidden /> Not scheduled
          </span>
          <span>Tap a day to mark it done or undo. Oldest on the left, today on the right.</span>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, icon, hint }: { label: string; value: string; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2" title={hint}>
      <p className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
        {icon}
        {label}
      </p>
      <p className="tabular text-base font-bold text-ink">{value}</p>
    </div>
  );
}
