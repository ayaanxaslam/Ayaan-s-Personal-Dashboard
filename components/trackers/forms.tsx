"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  addWater,
  saveFood,
  saveMeditation,
  saveSleep,
  saveSteps,
  saveWorkout,
  updateWater,
} from "@/app/actions/trackers";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FormError, inputClass, textareaClass } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import { ACTIVITY_LABELS, MEAL_LABELS, mlToUnit, unitLabel, unitToMl } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  ACTIVITY_TYPES,
  MEAL_TYPES,
  type ActivityType,
  type FoodRecord,
  type MealType,
  type MeditationRecord,
  type SleepRecord,
  type StepRecord,
  type WaterRecord,
  type WaterUnit,
  type WorkoutRecord,
} from "@/lib/types";

// ---------------------------------------------------------------------
// Shared dialog trigger
// ---------------------------------------------------------------------

export function DialogButton({
  label,
  title,
  description,
  children,
  icon = <Plus className="size-4" aria-hidden />,
  ...buttonProps
}: Omit<ButtonProps, "children" | "title"> & {
  label: ReactNode;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {icon}
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        {children(() => setOpen(false))}
      </Dialog>
    </>
  );
}

function FormActions({ pending, onCancel, submitLabel }: { pending: boolean; onCancel: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="secondary" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" loading={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}

function DateField({ id, value, onChange, max }: { id: string; value: string; onChange: (v: string) => void; max: string }) {
  return (
    <Field label="Date" htmlFor={id}>
      <input id={id} type="date" required max={max} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </Field>
  );
}

// ---------------------------------------------------------------------
// Sleep
// ---------------------------------------------------------------------

export function SleepForm({
  today,
  record,
  existingDates = [],
  onDone,
}: {
  today: string;
  record?: SleepRecord;
  existingDates?: string[];
  onDone: () => void;
}) {
  const [date, setDate] = useState(record?.sleep_date ?? today);
  const [hours, setHours] = useState(record ? String(Math.floor(record.duration_minutes / 60)) : "");
  const [minutes, setMinutes] = useState(record ? String(record.duration_minutes % 60) : "");
  const [quality, setQuality] = useState<number | null>(record?.quality ?? null);
  const [notes, setNotes] = useState(record?.notes ?? "");
  const { run, pending, error, setError } = useAction();
  const replacing = !record && existingDates.includes(date);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const h = Number(hours || 0);
    const m = Number(minutes || 0);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0 || m > 59 || h > 24) {
      setError("Enter hours (0–24) and minutes (0–59).");
      return;
    }
    const total = Math.round(h * 60 + m);
    if (total < 1 || total > 1440) {
      setError("Sleep must be between 1 minute and 24 hours.");
      return;
    }
    run(() => saveSleep({ date, durationMinutes: total, quality, notes }, record?.id), {
      success: record ? "Sleep updated" : "Sleep saved",
      onSuccess: onDone,
      silentError: true,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <DateField id="sleep-date" value={date} onChange={setDate} max={today} />
      <p className="-mt-2 text-xs text-ink-3">Use the date you woke up.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours" htmlFor="sleep-hours">
          <input
            id="sleep-hours"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={inputClass}
            placeholder="7"
            autoFocus
          />
        </Field>
        <Field label="Minutes" htmlFor="sleep-minutes">
          <input
            id="sleep-minutes"
            type="number"
            inputMode="numeric"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className={inputClass}
            placeholder="30"
          />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Quality (optional)</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((q) => (
            <button
              key={q}
              type="button"
              aria-pressed={quality === q}
              onClick={() => setQuality(quality === q ? null : q)}
              className={cn(
                "h-10 flex-1 rounded-xl text-sm font-semibold transition",
                quality === q ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
              )}
            >
              {q}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-3">1 = poor, 5 = excellent</p>
      </fieldset>
      <Field label="Notes (optional)" htmlFor="sleep-notes">
        <textarea id="sleep-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} />
      </Field>
      {replacing ? (
        <p className="rounded-2xl bg-accent-soft px-3.5 py-2.5 text-xs text-accent-strong">
          A sleep record already exists for this date — saving will replace it.
        </p>
      ) : null}
      <FormError message={error} />
      <FormActions pending={pending} onCancel={onDone} submitLabel={record ? "Save changes" : "Save sleep"} />
    </form>
  );
}

// ---------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------

export function StepsForm({
  today,
  record,
  existing = [],
  onDone,
}: {
  today: string;
  record?: StepRecord;
  existing?: StepRecord[];
  onDone: () => void;
}) {
  const [date, setDate] = useState(record?.record_date ?? today);
  const [steps, setSteps] = useState(record ? String(record.steps) : "");
  const { run, pending, error, setError } = useAction();
  const current = !record ? existing.find((r) => r.record_date === date) : undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(steps.replace(/[,\s]/g, ""));
    if (!steps.trim() || !Number.isInteger(n) || n < 0 || n > 200000) {
      setError("Enter a whole number of steps between 0 and 200,000.");
      return;
    }
    run(() => saveSteps({ date, steps: n }, record?.id), {
      success: "Steps saved",
      onSuccess: onDone,
      silentError: true,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <DateField id="steps-date" value={date} onChange={setDate} max={today} />
      <Field label="Steps" htmlFor="steps-count" hint="Enter the total for the day, e.g. from your phone or watch.">
        <input
          id="steps-count"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          className={inputClass}
          placeholder="8,500"
          autoFocus
        />
      </Field>
      {current ? (
        <p className="rounded-2xl bg-accent-soft px-3.5 py-2.5 text-xs text-accent-strong">
          This date already has {current.steps.toLocaleString("en-GB")} steps — saving will replace that total.
        </p>
      ) : null}
      <FormError message={error} />
      <FormActions pending={pending} onCancel={onDone} submitLabel="Save steps" />
    </form>
  );
}

// ---------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------

export function WaterForm({
  today,
  unit,
  record,
  onDone,
}: {
  today: string;
  unit: WaterUnit;
  record?: WaterRecord;
  onDone: () => void;
}) {
  const [date, setDate] = useState(record?.record_date ?? today);
  const initial = record ? mlToUnit(record.amount_ml, unit) : null;
  const [amount, setAmount] = useState(initial === null ? "" : String(Number(initial.toFixed(unit === "ml" ? 0 : 2))));
  const { run, pending, error, setError } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    const ml = unitToMl(v, unit);
    if (!amount.trim() || !Number.isFinite(v) || ml < 1 || ml > 5000) {
      setError(`Enter an amount up to ${unit === "ml" ? "5000 ml" : unit === "l" ? "5 L" : "169 fl oz"}.`);
      return;
    }
    run(() => (record ? updateWater(record.id, { date, amountMl: ml }) : addWater({ date, amountMl: ml })), {
      success: record ? "Entry updated" : "Water added",
      onSuccess: onDone,
      silentError: true,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <DateField id="water-date" value={date} onChange={setDate} max={today} />
      <Field label={`Amount (${unitLabel(unit)})`} htmlFor="water-amount">
        <input
          id="water-amount"
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          autoFocus
        />
      </Field>
      <FormError message={error} />
      <FormActions pending={pending} onCancel={onDone} submitLabel={record ? "Save changes" : "Add water"} />
    </form>
  );
}

// ---------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------

export function WorkoutForm({ today, record, onDone }: { today: string; record?: WorkoutRecord; onDone: () => void }) {
  const [date, setDate] = useState(record?.workout_date ?? today);
  const [type, setType] = useState<ActivityType>(record?.activity_type ?? "football");
  const [label, setLabel] = useState(record?.activity_label ?? "");
  const [duration, setDuration] = useState(record?.duration_minutes ? String(record.duration_minutes) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [completed, setCompleted] = useState(record?.completed ?? true);
  const { run, pending, error, setError } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    let mins: number | null = null;
    if (duration.trim()) {
      mins = Number(duration);
      if (!Number.isInteger(mins) || mins < 1 || mins > 1440) {
        setError("Duration must be a whole number of minutes (1–1440).");
        return;
      }
    }
    run(
      () =>
        saveWorkout(
          { date, activityType: type, activityLabel: type === "other" ? label : null, durationMinutes: mins, notes, completed },
          record?.id,
        ),
      { success: record ? "Workout updated" : "Workout added", onSuccess: onDone, silentError: true },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Activity</legend>
        <div className="grid grid-cols-3 gap-2">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={cn(
                "h-10 rounded-xl text-xs font-semibold transition",
                type === t ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
              )}
            >
              {ACTIVITY_LABELS[t]}
            </button>
          ))}
        </div>
      </fieldset>
      {type === "other" ? (
        <Field label="Activity name (optional)" htmlFor="workout-label">
          <input id="workout-label" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} placeholder="e.g. Swimming" />
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <DateField id="workout-date" value={date} onChange={setDate} max={today} />
        <Field label="Minutes (optional)" htmlFor="workout-duration">
          <input
            id="workout-duration"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={inputClass}
            placeholder="45"
          />
        </Field>
      </div>
      <Field label="Notes (optional)" htmlFor="workout-notes">
        <textarea id="workout-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} />
      </Field>
      <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-2 px-3.5 py-3 text-sm">
        <span>
          <span className="block font-semibold text-ink">Completed</span>
          <span className="block text-xs text-ink-3">Turn off to log a planned workout.</span>
        </span>
        <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
      </label>
      <FormError message={error} />
      <FormActions pending={pending} onCancel={onDone} submitLabel={record ? "Save changes" : "Add workout"} />
    </form>
  );
}

// ---------------------------------------------------------------------
// Meditation
// ---------------------------------------------------------------------

export function MeditationForm({ today, record, onDone }: { today: string; record?: MeditationRecord; onDone: () => void }) {
  const [date, setDate] = useState(record?.session_date ?? today);
  const [duration, setDuration] = useState(record ? String(record.duration_minutes) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const { run, pending, error, setError } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const mins = Number(duration);
    if (!duration.trim() || !Number.isInteger(mins) || mins < 1 || mins > 600) {
      setError("Duration must be a whole number of minutes (1–600).");
      return;
    }
    run(() => saveMeditation({ date, durationMinutes: mins, notes }, record?.id), {
      success: record ? "Session updated" : "Session saved",
      onSuccess: onDone,
      silentError: true,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <DateField id="med-date" value={date} onChange={setDate} max={today} />
      <Field label="Minutes" htmlFor="med-duration">
        <input
          id="med-duration"
          type="number"
          inputMode="numeric"
          min={1}
          max={600}
          required
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={inputClass}
          placeholder="10"
          autoFocus
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        {[5, 10, 15, 20, 30].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setDuration(String(m))}
            className="h-8 rounded-xl bg-surface-2 px-3 text-xs font-semibold text-ink-2 hover:bg-surface-3"
          >
            {m} min
          </button>
        ))}
      </div>
      <Field label="Notes (optional)" htmlFor="med-notes">
        <textarea id="med-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} />
      </Field>
      <FormError message={error} />
      <FormActions pending={pending} onCancel={onDone} submitLabel={record ? "Save changes" : "Save session"} />
    </form>
  );
}

// ---------------------------------------------------------------------
// Food diary
// ---------------------------------------------------------------------

/** Guess the meal from the time of day for new entries. */
function mealForNow(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 17) return "snack";
  return "dinner";
}

export function FoodForm({ today, record, onDone }: { today: string; record?: FoodRecord; onDone: () => void }) {
  const [date, setDate] = useState(record?.entry_date ?? today);
  const [meal, setMeal] = useState<MealType>(record?.meal_type ?? mealForNow);
  const [description, setDescription] = useState(record?.description ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const { run, pending, error, setError } = useAction();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Write what you ate or drank.");
      return;
    }
    run(() => saveFood({ date, mealType: meal, description, notes }, record?.id), {
      success: record ? "Entry updated" : "Food logged",
      onSuccess: onDone,
      silentError: true,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold text-ink-2">Meal</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {MEAL_TYPES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={meal === m}
              onClick={() => setMeal(m)}
              className={cn(
                "h-10 rounded-xl text-[11px] font-semibold transition sm:text-xs",
                meal === m ? "bg-ink text-surface" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
              )}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="What did you eat or drink?" htmlFor="food-desc">
        <textarea
          id="food-desc"
          required
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={textareaClass}
          placeholder="e.g. Chicken wrap, apple and a glass of milk"
          autoFocus
        />
      </Field>
      <DateField id="food-date" value={date} onChange={setDate} max={today} />
      <Field label="Notes (optional)" htmlFor="food-notes" hint="e.g. how hungry you were or how you felt after.">
        <input id="food-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>
      <FormError message={error} />
      <FormActions pending={pending} onCancel={onDone} submitLabel={record ? "Save changes" : "Log food"} />
    </form>
  );
}
