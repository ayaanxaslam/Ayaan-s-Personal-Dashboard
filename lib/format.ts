import type { ActivityType, MealType, WaterUnit } from "./types";

const ML_PER_FL_OZ = 29.5735;

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.round(n));
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** 455 → "7h 35m", 60 → "1h", 25 → "25m" */
export function formatMinutes(total: number): string {
  const m = Math.round(total);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function formatHours(total: number): string {
  return `${(total / 60).toFixed(1)}h`;
}

/** Convert millilitres to the display unit (number only). */
export function mlToUnit(ml: number, unit: WaterUnit): number {
  if (unit === "l") return ml / 1000;
  if (unit === "fl_oz") return ml / ML_PER_FL_OZ;
  return ml;
}

/** Convert a value in the display unit back to whole millilitres. */
export function unitToMl(value: number, unit: WaterUnit): number {
  if (unit === "l") return Math.round(value * 1000);
  if (unit === "fl_oz") return Math.round(value * ML_PER_FL_OZ);
  return Math.round(value);
}

export function unitLabel(unit: WaterUnit): string {
  return unit === "l" ? "L" : unit === "fl_oz" ? "fl oz" : "ml";
}

function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

export function formatWater(ml: number, unit: WaterUnit): string {
  if (unit === "fl_oz") return `${trimZeros((ml / ML_PER_FL_OZ).toFixed(1))} fl oz`;
  // Millilitres switch to litres once it reads better, or always when "l" is chosen.
  if (unit === "l" || ml >= 1000) return `${trimZeros((ml / 1000).toFixed(2))} L`;
  return `${formatNumber(ml)} ml`;
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  football: "Football",
  walking: "Walking",
  running: "Running",
  gym: "Gym",
  cycling: "Cycling",
  other: "Other",
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink",
};

export function workoutName(w: { activity_type: ActivityType; activity_label: string | null }): string {
  if (w.activity_type === "other" && w.activity_label) return w.activity_label;
  return ACTIVITY_LABELS[w.activity_type];
}

export function pct(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / goal) * 100)));
}
