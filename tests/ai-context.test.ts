import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContext } from "../lib/ai/context";
import { buildIndex, type RecordSet } from "../lib/metrics";
import { DEFAULT_SETTINGS, type UserSettings } from "../lib/types";

const settings: UserSettings = { user_id: "u", ...DEFAULT_SETTINGS, timezone: "Europe/London" };
const records: RecordSet = {
  habits: [
    {
      id: "h1",
      name: "Reading",
      icon: "book",
      schedule_type: "daily",
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      start_date: "2026-10-01",
      sort_order: 0,
      created_at: "",
    },
  ],
  completions: [
    { id: "c1", habit_id: "h1", completed_on: "2026-10-15" },
    { id: "c2", habit_id: "h1", completed_on: "2026-10-16" },
  ],
  sleep: [{ id: "s1", sleep_date: "2026-10-16", duration_minutes: 450, quality: 4, notes: "private note" }],
  steps: [],
  water: [],
  workouts: [],
  meditation: [],
  food: [
    { id: "f1", entry_date: "2026-10-16", meal_type: "breakfast", description: "Porridge with banana", notes: "secret note", created_at: "" },
  ],
};

const base = {
  records,
  idx: buildIndex(records),
  settings,
  today: "2026-10-17",
  from: "2026-10-05",
  timeZone: "Europe/London",
  trackingStart: "2026-10-01",
};

test("AI context contains only retrieved, real values", () => {
  const { text, meta } = buildContext({ ...base, topics: ["habits", "sleep", "steps"] });
  assert.match(text, /"Reading"/);
  assert.match(text, /current streak 2/); // 15th + 16th, today still pending
  assert.match(text, /10-16 7h 30m/);
  assert.match(text, /## STEPS \(0 days recorded/);
  assert.match(text, /Window: no records/);
  assert.doesNotMatch(text, /## WATER|## WORKOUTS|## MEDITATION/);
  assert.doesNotMatch(text, /private note/); // free-text notes are not sent
  assert.deepEqual(
    meta.datasets.map((d) => [d.name, d.records]),
    [
      ["Habit completions", 2],
      ["Sleep records", 1],
      ["Step records", 0],
    ],
  );
});

test("AI context for a single topic excludes everything else", () => {
  const { text, meta } = buildContext({ ...base, topics: ["sleep"] });
  assert.doesNotMatch(text, /## HABITS|Reading/);
  assert.equal(meta.datasets.length, 1);
});

test("AI context includes profile guidance and the food diary when asked", () => {
  const { text, meta } = buildContext({
    ...base,
    topics: ["food"],
    profile: { age: 16, height_cm: 175, weight_kg: 60 },
  });
  assert.match(text, /About the user \(from Settings\): age 16, height 175 cm, weight 60 kg/);
  assert.match(text, /sleep 8-10 h\/night/);
  assert.match(text, /UNDER 18/);
  assert.match(text, /10-16 breakfast: Porridge with banana/);
  assert.doesNotMatch(text, /secret note/);
  assert.deepEqual(meta.datasets, [{ name: "Food entries", records: 1 }]);
});

test("AI context says when no profile details exist", () => {
  const { text } = buildContext({ ...base, topics: ["sleep"] });
  assert.match(text, /has not entered age, height or weight/);
});
