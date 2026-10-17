"use client";

import { Pencil, Trash2, CheckCircle2, Circle } from "lucide-react";
import type { ReactNode } from "react";
import {
  deleteFood,
  deleteMeditation,
  deleteSleep,
  deleteSteps,
  deleteWater,
  deleteWorkout,
  setWorkoutCompleted,
} from "@/app/actions/trackers";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useAction } from "@/components/ui/use-action";
import { formatRelativeDay } from "@/lib/dates";
import { MEAL_LABELS, formatMinutes, formatNumber, formatWater, workoutName } from "@/lib/format";
import type { FoodRecord, MeditationRecord, SleepRecord, StepRecord, WaterRecord, WaterUnit, WorkoutRecord } from "@/lib/types";
import { DialogButton, FoodForm, MeditationForm, SleepForm, StepsForm, WaterForm, WorkoutForm } from "./forms";

function Row({
  title,
  value,
  meta,
  actions,
  leading,
}: {
  title: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  actions: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{value}</p>
        <p className="truncate text-xs text-ink-3">
          {title}
          {meta ? <> · {meta}</> : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">{actions}</div>
    </li>
  );
}

function EditButton({ title, children }: { title: string; children: (close: () => void) => ReactNode }) {
  return (
    <DialogButton
      label={<span className="sr-only">Edit</span>}
      title={title}
      variant="ghost"
      size="icon"
      icon={<Pencil className="size-4" aria-hidden />}
    >
      {children}
    </DialogButton>
  );
}

function DeleteButton({ action, what }: { action: () => ReturnType<typeof deleteSleep>; what: string }) {
  return (
    <ConfirmButton
      action={action}
      title={`Delete this ${what}?`}
      description="This permanently removes the record. It can't be undone."
      successMessage="Deleted"
      variant="ghost"
      size="icon"
      aria-label={`Delete ${what}`}
      className="hover:text-danger"
    >
      <Trash2 className="size-4" aria-hidden />
    </ConfirmButton>
  );
}

const listClass = "divide-y divide-line";

export function SleepList({ records, today }: { records: SleepRecord[]; today: string }) {
  return (
    <ul className={listClass}>
      {records.map((r) => (
        <Row
          key={r.id}
          value={formatMinutes(r.duration_minutes)}
          title={formatRelativeDay(r.sleep_date, today)}
          meta={[r.quality ? `Quality ${r.quality}/5` : null, r.notes].filter(Boolean).join(" · ") || undefined}
          actions={
            <>
              <EditButton title="Edit sleep">{(close) => <SleepForm today={today} record={r} onDone={close} />}</EditButton>
              <DeleteButton action={() => deleteSleep(r.id)} what="sleep record" />
            </>
          }
        />
      ))}
    </ul>
  );
}

export function StepsList({ records, today }: { records: StepRecord[]; today: string }) {
  return (
    <ul className={listClass}>
      {records.map((r) => (
        <Row
          key={r.id}
          value={`${formatNumber(r.steps)} steps`}
          title={formatRelativeDay(r.record_date, today)}
          actions={
            <>
              <EditButton title="Edit steps">{(close) => <StepsForm today={today} record={r} onDone={close} />}</EditButton>
              <DeleteButton action={() => deleteSteps(r.id)} what="step record" />
            </>
          }
        />
      ))}
    </ul>
  );
}

export function WaterList({
  records,
  today,
  unit,
  timeZone,
}: {
  records: WaterRecord[];
  today: string;
  unit: WaterUnit;
  timeZone: string;
}) {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone });
  return (
    <ul className={listClass}>
      {records.map((r) => (
        <Row
          key={r.id}
          value={formatWater(r.amount_ml, unit)}
          title={formatRelativeDay(r.record_date, today)}
          meta={time.format(new Date(r.created_at))}
          actions={
            <>
              <EditButton title="Edit water entry">
                {(close) => <WaterForm today={today} unit={unit} record={r} onDone={close} />}
              </EditButton>
              <DeleteButton action={() => deleteWater(r.id)} what="water entry" />
            </>
          }
        />
      ))}
    </ul>
  );
}

function WorkoutToggle({ record }: { record: WorkoutRecord }) {
  const { run, pending } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        run(() => setWorkoutCompleted(record.id, !record.completed), {
          success: record.completed ? "Marked as not completed" : "Marked as completed",
        })
      }
      aria-pressed={record.completed}
      aria-label={record.completed ? "Mark workout as not completed" : "Mark workout as completed"}
      className="grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-surface-2 disabled:opacity-50"
    >
      {record.completed ? (
        <CheckCircle2 className="size-5 text-mint" aria-hidden />
      ) : (
        <Circle className="size-5 text-ink-3" aria-hidden />
      )}
    </button>
  );
}

export function WorkoutList({ records, today }: { records: WorkoutRecord[]; today: string }) {
  return (
    <ul className={listClass}>
      {records.map((r) => (
        <Row
          key={r.id}
          leading={<WorkoutToggle record={r} />}
          value={
            <>
              {workoutName(r)}
              {r.duration_minutes ? <span className="font-normal text-ink-3"> · {formatMinutes(r.duration_minutes)}</span> : null}
              {!r.completed ? <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">Planned</span> : null}
            </>
          }
          title={formatRelativeDay(r.workout_date, today)}
          meta={r.notes ?? undefined}
          actions={
            <>
              <EditButton title="Edit workout">{(close) => <WorkoutForm today={today} record={r} onDone={close} />}</EditButton>
              <DeleteButton action={() => deleteWorkout(r.id)} what="workout" />
            </>
          }
        />
      ))}
    </ul>
  );
}

export function MeditationList({ records, today }: { records: MeditationRecord[]; today: string }) {
  return (
    <ul className={listClass}>
      {records.map((r) => (
        <Row
          key={r.id}
          value={formatMinutes(r.duration_minutes)}
          title={formatRelativeDay(r.session_date, today)}
          meta={r.notes ?? undefined}
          actions={
            <>
              <EditButton title="Edit session">{(close) => <MeditationForm today={today} record={r} onDone={close} />}</EditButton>
              <DeleteButton action={() => deleteMeditation(r.id)} what="session" />
            </>
          }
        />
      ))}
    </ul>
  );
}

export function FoodList({ records, today, showDate = true }: { records: FoodRecord[]; today: string; showDate?: boolean }) {
  return (
    <ul className={listClass}>
      {records.map((r) => (
        <Row
          key={r.id}
          value={<span className="font-semibold whitespace-normal">{r.description}</span>}
          title={showDate ? `${MEAL_LABELS[r.meal_type]} · ${formatRelativeDay(r.entry_date, today)}` : MEAL_LABELS[r.meal_type]}
          meta={r.notes ?? undefined}
          actions={
            <>
              <EditButton title="Edit food entry">{(close) => <FoodForm today={today} record={r} onDone={close} />}</EditButton>
              <DeleteButton action={() => deleteFood(r.id)} what="food entry" />
            </>
          }
        />
      ))}
    </ul>
  );
}
