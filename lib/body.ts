// Height/weight conversions and simple, published guidance based on the
// details in "About you". Everything here is general guidance, not medical
// advice, and the UI says so.

import type { BodyUnits } from "./types";

const CM_PER_IN = 2.54;
const KG_PER_LB = 0.45359237;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalIn = Math.round(cm / CM_PER_IN);
  return { feet: Math.floor(totalIn / 12), inches: totalIn % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_IN * 10) / 10;
}

export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 10) / 10;
}

export function formatHeight(cm: number, units: BodyUnits): string {
  if (units === "imperial") {
    const { feet, inches } = cmToFeetInches(cm);
    return `${feet}′ ${inches}″`;
  }
  return `${Math.round(cm)} cm`;
}

export function formatWeight(kg: number, units: BodyUnits): string {
  return units === "imperial" ? `${Math.round(kgToLb(kg))} lb` : `${Math.round(kg * 10) / 10} kg`;
}

export type Guidance = {
  /** Recommended nightly sleep, in hours (AASM / CDC age bands). */
  sleep: { minHours: number; maxHours: number; source: string };
  /** Physical activity guideline (WHO 2020). */
  activity: { weeklyMinutes: number; text: string; source: string };
  /** A common daily step target — not an official guideline. */
  steps: number;
  /** Rough daily drinks guide from body weight, in ml (null without weight). */
  waterMl: number | null;
  isUnder18: boolean;
};

/** Published guidance for an age (and optionally weight). Returns null without an age. */
export function guidanceFor(age: number | null, weightKg: number | null): Guidance | null {
  if (!age) return null;
  const sleep =
    age <= 12
      ? { minHours: 9, maxHours: 12 }
      : age <= 17
        ? { minHours: 8, maxHours: 10 }
        : age <= 64
          ? { minHours: 7, maxHours: 9 }
          : { minHours: 7, maxHours: 8 };
  const isUnder18 = age < 18;
  const activity = isUnder18
    ? { weeklyMinutes: 420, text: "an average of 60 minutes of moderate-to-vigorous activity a day" }
    : { weeklyMinutes: 150, text: "at least 150 minutes of moderate activity a week" };
  // About 33 ml per kg is a widely used rule of thumb for drinks; clamp to a sensible range.
  const waterMl = weightKg ? Math.min(3500, Math.max(1200, Math.round((weightKg * 33) / 100) * 100)) : null;
  return {
    sleep: { ...sleep, source: "American Academy of Sleep Medicine / CDC" },
    activity: { ...activity, source: "World Health Organization" },
    steps: isUnder18 ? 10000 : 8000,
    waterMl,
    isUnder18,
  };
}

/** Approximate walking distance in km: stride ≈ 0.415 × height. */
export function stepsToKm(steps: number, heightCm: number): number {
  return (steps * heightCm * 0.415) / 100_000;
}
