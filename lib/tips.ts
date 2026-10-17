// Personalised, encouraging tips built from "About you" plus recent records.
// Only real logged data is used; with too little data the tip asks you to
// log more instead of guessing.

import { guidanceFor, stepsToKm } from "./body";
import { formatMinutes, formatNumber, formatWater } from "./format";
import type { WaterUnit } from "./types";

export type TipKind = "sleep" | "activity" | "steps" | "water" | "food" | "profile";
export type Tip = { kind: TipKind; title: string; text: string; tone: "good" | "nudge" | "info" };

export type TipInput = {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  /** Average minutes over recorded nights in the last 7 days. */
  sleepAverage: number | null;
  sleepNights: number;
  /** Completed workout minutes (with a logged duration) in the last 7 days. */
  activeMinutes7: number;
  stepsToday: number | null;
  waterGoalMl: number;
  waterUnit: WaterUnit;
  mealsToday: number;
};

export function buildTips(i: TipInput): Tip[] {
  if (!i.age && !i.heightCm && !i.weightKg) {
    return [
      {
        kind: "profile",
        tone: "info",
        title: "Make these tips yours",
        text: "Add your age, height and weight in Settings to get suggestions based on guidance for your age.",
      },
    ];
  }

  const tips: Tip[] = [];
  const g = guidanceFor(i.age, i.weightKg);

  if (g) {
    const range = `${g.sleep.minHours}–${g.sleep.maxHours} hours`;
    if (i.sleepNights < 3 || i.sleepAverage === null) {
      tips.push({
        kind: "sleep",
        tone: "info",
        title: "Track a few nights of sleep",
        text: `At ${i.age}, ${range} a night is recommended. Log at least 3 nights to see how your average compares.`,
      });
    } else if (i.sleepAverage < g.sleep.minHours * 60) {
      tips.push({
        kind: "sleep",
        tone: "nudge",
        title: "Aim for a little more sleep",
        text: `Your average is ${formatMinutes(i.sleepAverage)} over ${i.sleepNights} nights; ${range} is recommended at ${i.age}. Try starting to wind down 30 minutes earlier.`,
      });
    } else if (i.sleepAverage > g.sleep.maxHours * 60) {
      tips.push({
        kind: "sleep",
        tone: "info",
        title: "Plenty of sleep",
        text: `Your ${formatMinutes(i.sleepAverage)} average is above the ${range} range for your age. A regular wake-up time can help you feel more refreshed.`,
      });
    } else {
      tips.push({
        kind: "sleep",
        tone: "good",
        title: "Sleep is on track",
        text: `Your ${formatMinutes(i.sleepAverage)} average is within the ${range} recommended at ${i.age}. Keep it up!`,
      });
    }

    tips.push(
      i.activeMinutes7 >= g.activity.weeklyMinutes
        ? {
            kind: "activity",
            tone: "good",
            title: "Great week for activity",
            text: `${formatMinutes(i.activeMinutes7)} of logged workouts in the last 7 days meets the guideline of ${g.activity.text}.`,
          }
        : {
            kind: "activity",
            tone: "nudge",
            title: "Keep moving",
            text: `You've logged ${i.activeMinutes7 ? formatMinutes(i.activeMinutes7) : "no timed workouts"} in the last 7 days. The guideline for your age is ${g.activity.text} — walks, football and bike rides all count.`,
          },
    );

    if (g.waterMl && Math.abs(g.waterMl - i.waterGoalMl) / g.waterMl > 0.2) {
      tips.push({
        kind: "water",
        tone: "info",
        title: "Check your water goal",
        text: `A rough guide for your weight is about ${formatWater(g.waterMl, i.waterUnit)} of drinks a day; your goal is ${formatWater(i.waterGoalMl, i.waterUnit)}. Drink more when it's hot or you're active.`,
      });
    }
  }

  if (i.heightCm && i.stepsToday) {
    tips.push({
      kind: "steps",
      tone: "info",
      title: `About ${stepsToKm(i.stepsToday, i.heightCm).toFixed(1)} km today`,
      text: `Based on your height, your ${formatNumber(i.stepsToday)} steps are roughly that distance.`,
    });
  }

  if (i.mealsToday === 0) {
    tips.push({
      kind: "food",
      tone: "info",
      title: "Log what you eat",
      text: "A simple food diary helps you notice patterns, like skipped breakfasts. The AI chat can summarise it for you.",
    });
  }

  if (!g) {
    tips.unshift({
      kind: "profile",
      tone: "info",
      title: "Add your age",
      text: "With your age, tips can compare your sleep and activity with guidance for your age group.",
    });
  }

  return tips.slice(0, 4);
}
