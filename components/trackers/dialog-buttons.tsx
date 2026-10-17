"use client";

// Client wrappers so Server Components can open tracker forms without
// passing functions across the server/client boundary.

import type { ReactNode } from "react";
import type { ButtonProps } from "@/components/ui/button";
import { HabitForm } from "@/components/habits/habit-form";
import type { SleepRecord, StepRecord, WaterUnit } from "@/lib/types";
import { DialogButton, FoodForm, MeditationForm, SleepForm, StepsForm, WaterForm, WorkoutForm } from "./forms";

type Common = {
  today: string;
  label: ReactNode;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

function pick({ label, title, description, icon, variant, size, className }: Common) {
  return { label, title, description, variant, size, className, ...(icon !== undefined ? { icon } : {}) };
}

export function SleepDialogButton(props: Common & { record?: SleepRecord | null; existingDates?: string[] }) {
  return (
    <DialogButton {...pick(props)}>
      {(close) => (
        <SleepForm today={props.today} record={props.record ?? undefined} existingDates={props.existingDates} onDone={close} />
      )}
    </DialogButton>
  );
}

export function StepsDialogButton(props: Common & { existing?: StepRecord[] }) {
  return (
    <DialogButton {...pick(props)}>
      {(close) => <StepsForm today={props.today} existing={props.existing} onDone={close} />}
    </DialogButton>
  );
}

export function WaterDialogButton(props: Common & { unit: WaterUnit }) {
  return (
    <DialogButton {...pick(props)}>{(close) => <WaterForm today={props.today} unit={props.unit} onDone={close} />}</DialogButton>
  );
}

export function WorkoutDialogButton(props: Common) {
  return <DialogButton {...pick(props)}>{(close) => <WorkoutForm today={props.today} onDone={close} />}</DialogButton>;
}

export function MeditationDialogButton(props: Common) {
  return <DialogButton {...pick(props)}>{(close) => <MeditationForm today={props.today} onDone={close} />}</DialogButton>;
}

export function NewHabitButton(props: Common) {
  return <DialogButton {...pick(props)}>{(close) => <HabitForm today={props.today} onDone={close} />}</DialogButton>;
}

export function FoodDialogButton(props: Common) {
  return <DialogButton {...pick(props)}>{(close) => <FoodForm today={props.today} onDone={close} />}</DialogButton>;
}
