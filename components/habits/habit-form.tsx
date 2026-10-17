"use client";

import { useState } from "react";
import { createHabit, updateHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClass } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import { HABIT_ICONS, HABIT_ICON_KEYS } from "@/lib/habit-icons";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { Habit } from "@/lib/types";

export function HabitForm({ habit, today, onDone }: { habit?: Habit; today: string; onDone: () => void }) {
  const [name, setName] = useState(habit?.name ?? "");
  const [icon, setIcon] = useState<string | null>(habit?.icon ?? null);
  const [scheduleType, setScheduleType] = useState<"daily" | "custom">(habit?.schedule_type ?? "daily");
  const [days, setDays] = useState<number[]>(habit?.schedule_days ?? [1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(habit?.start_date ?? today);
  const { run, pending, error, setError } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give your habit a name.");
    if (scheduleType === "custom" && days.length === 0) return setError("Choose at least one day.");
    const input = { name, icon, scheduleType, scheduleDays: days, startDate };
    run(() => (habit ? updateHabit(habit.id, input) : createHabit(input)), {
      success: habit ? "Habit updated" : "Habit created",
      onSuccess: onDone,
      silentError: true,
    });
  }

  // Monday-first display order.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Name" htmlFor="habit-name">
        <input
          id="habit-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Read for 20 minutes"
          autoFocus
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Icon (optional)</legend>
        <div className="grid grid-cols-8 gap-1.5">
          {HABIT_ICON_KEYS.map((key) => {
            const { icon: Icon, label } = HABIT_ICONS[key];
            const selected = icon === key;
            return (
              <button
                key={key}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => setIcon(selected ? null : key)}
                className={cn(
                  "grid aspect-square place-items-center rounded-xl transition",
                  selected ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Schedule</legend>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
          {(["daily", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={scheduleType === t}
              onClick={() => setScheduleType(t)}
              className={cn(
                "h-9 rounded-xl text-sm font-semibold transition",
                scheduleType === t ? "bg-surface text-ink shadow-card" : "text-ink-3",
              )}
            >
              {t === "daily" ? "Every day" : "Selected days"}
            </button>
          ))}
        </div>
        {scheduleType === "custom" ? (
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {order.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                  className={cn(
                    "h-10 rounded-xl text-xs font-semibold transition",
                    on ? "bg-ink text-surface" : "bg-surface-2 text-ink-3 hover:bg-surface-3",
                  )}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              );
            })}
          </div>
        ) : null}
      </fieldset>

      <Field
        label="Tracking since"
        htmlFor="habit-start"
        hint="Days before this date don't count towards completion or streaks."
      >
        <input
          id="habit-start"
          type="date"
          max={today}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={inputClass}
        />
      </Field>

      <FormError message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {habit ? "Save changes" : "Create habit"}
        </Button>
      </div>
    </form>
  );
}
