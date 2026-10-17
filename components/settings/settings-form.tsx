"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, CheckCircle2, X, Plus } from "lucide-react";
import { saveSettings, type SettingsInput } from "@/app/actions/settings";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import { formatWater, mlToUnit, unitLabel, unitToMl } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { BodyUnits, GoalMetric, Profile, ThemePreference, UserSettings, WaterUnit } from "@/lib/types";
import { cmToFeetInches, feetInchesToCm, guidanceFor, kgToLb, lbToKg } from "@/lib/body";

const METRIC_LABELS: Record<GoalMetric, string> = {
  sleep: "Sleep goal",
  steps: "Step goal",
  water: "Water goal",
  meditation: "Meditation goal",
  workout: "Complete a workout",
};

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 rounded-xl px-2 text-sm font-semibold transition",
            value === o.value ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const noopSubscribe = () => () => {};
const getBrowserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || null;
const NO_ZONES: string[] = [];
const getNoTimeZones = () => NO_ZONES;
let zonesCache: string[] | null = null;
const getTimeZones = () => {
  if (!zonesCache) {
    try {
      zonesCache = (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf("timeZone");
    } catch {
      zonesCache = NO_ZONES;
    }
  }
  return zonesCache;
};

type ProfileFields = Pick<Profile, "display_name" | "age" | "height_cm" | "weight_kg"> | null;

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function SuggestButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-7 rounded-lg bg-surface px-2.5 text-[11px] font-semibold text-accent-strong shadow-card hover:brightness-95"
    >
      Use
    </button>
  );
}

export function SettingsForm({ settings, profile }: { settings: UserSettings; profile: ProfileFields }) {
  // Read browser-only values after hydration so server and client markup match.
  const browserTz = useSyncExternalStore(noopSubscribe, getBrowserTz, () => null);
  const timeZones = useSyncExternalStore(noopSubscribe, getTimeZones, getNoTimeZones);

  const [name, setName] = useState(profile?.display_name ?? "");
  const [age, setAge] = useState(str(profile?.age));
  const [bodyUnits, setBodyUnits] = useState<BodyUnits>(settings.body_units);
  const initialFtIn = profile?.height_cm ? cmToFeetInches(profile.height_cm) : null;
  const [heightCm, setHeightCm] = useState(str(profile?.height_cm));
  const [heightFt, setHeightFt] = useState(str(initialFtIn?.feet));
  const [heightIn, setHeightIn] = useState(str(initialFtIn?.inches));
  const [weightKg, setWeightKg] = useState(str(profile?.weight_kg));
  const [weightLb, setWeightLb] = useState(profile?.weight_kg ? String(Math.round(kgToLb(profile.weight_kg))) : "");
  const [stepGoal, setStepGoal] = useState(String(settings.step_goal));
  const [sleepHours, setSleepHours] = useState(String(Math.floor(settings.sleep_goal_minutes / 60)));
  const [sleepMins, setSleepMins] = useState(String(settings.sleep_goal_minutes % 60));
  const [unit, setUnit] = useState<WaterUnit>(settings.water_unit);
  const [waterGoal, setWaterGoal] = useState(String(+mlToUnit(settings.water_goal_ml, settings.water_unit).toFixed(2)));
  const [increments, setIncrements] = useState<number[]>(settings.water_increments_ml);
  const [newIncrement, setNewIncrement] = useState("");
  const [meditationGoal, setMeditationGoal] = useState(String(settings.meditation_goal_minutes));
  const [timezone, setTimezone] = useState(settings.timezone ?? "UTC");
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(settings.week_starts_on);
  const [theme, setTheme] = useState<ThemePreference>(settings.theme);
  const [metrics, setMetrics] = useState<GoalMetric[]>(settings.daily_goal_metrics);
  const { run, pending, error } = useAction();
  const [incError, setIncError] = useState<string | null>(null);

  /** Current height/weight in metric (null when empty or invalid). */
  function bodyMetric(): { height: number | null; weight: number | null } {
    const n = (v: string) => (v.trim() === "" ? null : Number(v));
    if (bodyUnits === "metric") return { height: n(heightCm), weight: n(weightKg) };
    const ft = n(heightFt);
    const inch = n(heightIn) ?? 0;
    const lb = n(weightLb);
    return {
      height: ft === null && !heightIn.trim() ? null : feetInchesToCm(ft ?? 0, inch),
      weight: lb === null ? null : lbToKg(lb),
    };
  }

  function changeBodyUnits(next: BodyUnits) {
    if (next === bodyUnits) return;
    const { height, weight } = bodyMetric();
    if (next === "imperial") {
      const fi = height && Number.isFinite(height) ? cmToFeetInches(height) : null;
      setHeightFt(str(fi?.feet));
      setHeightIn(str(fi?.inches));
      setWeightLb(weight && Number.isFinite(weight) ? String(Math.round(kgToLb(weight))) : "");
    } else {
      setHeightCm(height && Number.isFinite(height) ? String(Math.round(height)) : "");
      setWeightKg(weight && Number.isFinite(weight) ? String(Math.round(weight * 10) / 10) : "");
    }
    setBodyUnits(next);
  }

  const ageNum = age.trim() === "" ? null : Number(age);
  const validAge = ageNum !== null && Number.isInteger(ageNum) && ageNum >= 5 && ageNum <= 120 ? ageNum : null;
  const weightNow = bodyMetric().weight;
  const guide = guidanceFor(validAge, weightNow && Number.isFinite(weightNow) && weightNow >= 10 ? weightNow : null);

  function changeUnit(next: WaterUnit) {
    // Keep the goal the same physical amount when switching units.
    const ml = unitToMl(Number(waterGoal) || 0, unit);
    setWaterGoal(String(+mlToUnit(ml, next).toFixed(2)));
    setUnit(next);
  }

  function addIncrement() {
    const ml = unitToMl(Number(newIncrement), unit);
    if (!newIncrement || !Number.isFinite(ml) || ml < 1 || ml > 5000) return setIncError("Quick-add amounts must be up to 5 litres.");
    if (increments.length >= 6) return setIncError("You can have up to six quick-add amounts.");
    setIncrements([...new Set([...increments, ml])].sort((a, b) => a - b));
    setNewIncrement("");
    setIncError(null);
  }

  /** Validates the form and returns what would be saved. */
  function build(): { ok: true; payload: SettingsInput } | { ok: false; error: string } {
    const sleepGoal = Number(sleepHours || 0) * 60 + Number(sleepMins || 0);
    const waterMl = unitToMl(Number(waterGoal), unit);
    const steps = Number(stepGoal);
    const med = Number(meditationGoal);
    const fail = (error: string) => ({ ok: false as const, error });
    if (!stepGoal.trim() || !Number.isInteger(steps) || steps < 100 || steps > 100000) return fail("Step goal must be between 100 and 100,000.");
    if (!Number.isInteger(sleepGoal) || sleepGoal < 60 || sleepGoal > 1080) return fail("Sleep goal must be between 1 and 18 hours.");
    if (!waterGoal.trim() || !Number.isFinite(waterMl) || waterMl < 100 || waterMl > 10000) return fail("Water goal must be between 100 ml and 10 L.");
    if (!meditationGoal.trim() || !Number.isInteger(med) || med < 1 || med > 600) return fail("Meditation goal must be between 1 and 600 minutes.");
    if (!increments.length) return fail("Add at least one quick-add water amount.");
    if (ageNum !== null && validAge === null) return fail("Age must be a whole number between 5 and 120.");
    const body = bodyMetric();
    if (body.height !== null && (!Number.isFinite(body.height) || body.height < 50 || body.height > 272))
      return fail("Height looks out of range — check the number and units.");
    if (body.weight !== null && (!Number.isFinite(body.weight) || body.weight < 10 || body.weight > 400))
      return fail("Weight looks out of range — check the number and units.");
    return {
      ok: true,
      payload: {
        displayName: name,
        age: validAge,
        heightCm: body.height,
        weightKg: body.weight,
        bodyUnits,
        stepGoal: steps,
        sleepGoalMinutes: sleepGoal,
        waterGoalMl: waterMl,
        meditationGoalMinutes: med,
        waterUnit: unit,
        waterIncrementsMl: increments,
        timezone,
        weekStartsOn,
        theme,
        dailyGoalMetrics: metrics,
      },
    };
  }

  // ---- Auto-save: save ~0.8s after the last valid change. ----
  const built = build();
  const key = built.ok ? JSON.stringify(built.payload) : null;
  const [savedKey, setSavedKey] = useState(key);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key || key === savedKey) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = key;
    const timer = window.setTimeout(() => {
      pendingRef.current = null;
      setStatus("saving");
      run(() => saveSettings(JSON.parse(key) as SettingsInput), {
        silentError: true,
        onSuccess: () => {
          setSavedKey(key);
          setStatus("saved");
        },
      }).then((ok) => {
        if (!ok) setStatus("error");
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [key, savedKey, run]);

  // If you leave the page before the timer fires, save straight away.
  useEffect(
    () => () => {
      if (pendingRef.current) void saveSettings(JSON.parse(pendingRef.current) as SettingsInput);
    },
    [],
  );

  // Apply the theme as soon as it's picked.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const validationError = built.ok ? null : built.error;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6" noValidate>
      <Card>
        <CardHeader
          title="About you"
          subtitle="All optional. Used for your personalised tips, suggested goals and the AI chat."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" htmlFor="s-name">
            <input id="s-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="given-name" />
          </Field>
          <Field label="Age" htmlFor="s-age">
            <input id="s-age" type="number" inputMode="numeric" min={5} max={120} value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} placeholder="e.g. 16" />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Units</p>
            <Segmented
              label="Height and weight units"
              value={bodyUnits}
              onChange={changeBodyUnits}
              options={[
                { value: "metric", label: "cm · kg" },
                { value: "imperial", label: "ft/in · lb" },
              ]}
            />
          </div>
          {bodyUnits === "metric" ? (
            <>
              <Field label="Height (cm)" htmlFor="s-height">
                <input id="s-height" type="number" inputMode="decimal" step="any" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={inputClass} placeholder="e.g. 175" />
              </Field>
              <Field label="Weight (kg)" htmlFor="s-weight">
                <input id="s-weight" type="number" inputMode="decimal" step="any" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={inputClass} placeholder="e.g. 65" />
              </Field>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="mb-1.5 text-xs font-semibold text-ink-2">Height</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className="relative">
                    <span className="sr-only">Feet</span>
                    <input type="number" inputMode="numeric" min={1} max={8} value={heightFt} onChange={(e) => setHeightFt(e.target.value)} className={inputClass} placeholder="5" />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">ft</span>
                  </label>
                  <label className="relative">
                    <span className="sr-only">Inches</span>
                    <input type="number" inputMode="numeric" min={0} max={11} value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className={inputClass} placeholder="9" />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">in</span>
                  </label>
                </div>
              </fieldset>
              <Field label="Weight (lb)" htmlFor="s-weight-lb">
                <input id="s-weight-lb" type="number" inputMode="decimal" step="any" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className={inputClass} placeholder="e.g. 145" />
              </Field>
            </>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-3">
          Stored privately in your account. Suggestions use general public-health guidance and aren&apos;t medical advice.
        </p>
      </Card>

      <Card>
        <CardHeader title="Daily goals" subtitle="Used for progress rings, charts and the daily goals gauge." />
        {guide ? (
          <div className="mb-4 rounded-2xl bg-accent-soft px-4 py-3 text-xs text-ink-2">
            <p className="mb-2 font-semibold text-ink">Suggested for age {validAge}</p>
            <ul className="space-y-1.5">
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Sleep: {guide.sleep.minHours}–{guide.sleep.maxHours} hours a night ({guide.sleep.source})
                </span>
                <SuggestButton
                  onClick={() => {
                    const mid = (guide.sleep.minHours + guide.sleep.maxHours) / 2;
                    setSleepHours(String(Math.floor(mid)));
                    setSleepMins(String(Math.round((mid % 1) * 60)));
                  }}
                />
              </li>
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>Steps: {guide.steps.toLocaleString("en-GB")} a day (a common target)</span>
                <SuggestButton onClick={() => setStepGoal(String(guide.steps))} />
              </li>
              {guide.waterMl ? (
                <li className="flex flex-wrap items-center justify-between gap-2">
                  <span>Water: about {formatWater(guide.waterMl, unit)} of drinks a day (rough guide from your weight)</span>
                  <SuggestButton onClick={() => setWaterGoal(String(+mlToUnit(guide.waterMl!, unit).toFixed(2)))} />
                </li>
              ) : null}
              <li>Activity: {guide.activity.text} ({guide.activity.source})</li>
            </ul>
            <p className="mt-2 text-ink-3">“Use” updates your goal and saves it automatically.</p>
          </div>
        ) : (
          <p className="mb-4 text-xs text-ink-3">Add your age (and weight) above to see suggested goals.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Steps per day" htmlFor="s-steps">
            <input id="s-steps" type="number" inputMode="numeric" min={100} max={100000} value={stepGoal} onChange={(e) => setStepGoal(e.target.value)} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-ink-2">Sleep per night</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className="relative">
                <span className="sr-only">Hours</span>
                <input type="number" inputMode="numeric" min={1} max={18} value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className={inputClass} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">h</span>
              </label>
              <label className="relative">
                <span className="sr-only">Minutes</span>
                <input type="number" inputMode="numeric" min={0} max={59} value={sleepMins} onChange={(e) => setSleepMins(e.target.value)} className={inputClass} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-3">m</span>
              </label>
            </div>
          </fieldset>
          <Field label={`Water per day (${unitLabel(unit)})`} htmlFor="s-water">
            <input id="s-water" type="number" inputMode="decimal" step="any" value={waterGoal} onChange={(e) => setWaterGoal(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Meditation per day (minutes)" htmlFor="s-med">
            <input id="s-med" type="number" inputMode="numeric" min={1} max={600} value={meditationGoal} onChange={(e) => setMeditationGoal(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Goals reached today" subtitle="Habits due today always count. Choose which tracker goals count too." />
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(METRIC_LABELS) as GoalMetric[]).map((m) => {
            const on = metrics.includes(m);
            return (
              <label key={m} className="flex cursor-pointer items-center justify-between rounded-2xl bg-surface-2 px-3.5 py-3 text-sm font-semibold text-ink">
                {METRIC_LABELS[m]}
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--accent)]"
                  checked={on}
                  onChange={() => setMetrics(on ? metrics.filter((x) => x !== m) : [...metrics, m])}
                />
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Water" subtitle="Amounts are stored in millilitres and shown in your chosen unit." />
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Display unit</p>
            <Segmented
              label="Water unit"
              value={unit}
              onChange={changeUnit}
              options={[
                { value: "ml", label: "ml / L" },
                { value: "l", label: "Litres" },
                { value: "fl_oz", label: "fl oz" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Quick-add amounts</p>
            <ul className="mb-2 flex flex-wrap gap-2">
              {increments.map((ml) => (
                <li key={ml} className="inline-flex h-9 items-center gap-1 rounded-xl bg-accent-soft pr-1 pl-3 text-xs font-semibold text-accent-strong">
                  {formatWater(ml, unit)}
                  <button
                    type="button"
                    onClick={() => setIncrements(increments.filter((x) => x !== ml))}
                    className="grid size-7 place-items-center rounded-lg hover:bg-surface/60"
                    aria-label={`Remove ${formatWater(ml, unit)}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <label htmlFor="s-inc" className="sr-only">
                New quick-add amount in {unitLabel(unit)}
              </label>
              <input
                id="s-inc"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder={`Amount in ${unitLabel(unit)}`}
                value={newIncrement}
                onChange={(e) => setNewIncrement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIncrement();
                  }
                }}
                className={cn(inputClass, "max-w-48")}
              />
              <Button variant="secondary" onClick={addIncrement}>
                <Plus className="size-4" aria-hidden /> Add
              </Button>
            </div>
            {incError ? (
              <p role="alert" className="mt-2 text-xs text-danger">
                {incError}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Time & appearance" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Timezone"
            htmlFor="s-tz"
            hint={
              browserTz && timezone !== browserTz ? (
                <button type="button" className="font-semibold text-accent-strong hover:underline" onClick={() => setTimezone(browserTz)}>
                  Use this device&apos;s timezone ({browserTz})
                </button>
              ) : (
                "Decides when a new day starts."
              )
            }
          >
            <select id="s-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputClass}>
              {(timeZones.includes(timezone) ? timeZones : [timezone, ...timeZones]).map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Week starts on</p>
            <Segmented
              label="Week starts on"
              value={weekStartsOn}
              onChange={setWeekStartsOn}
              options={[
                { value: 1, label: "Monday" },
                { value: 0, label: "Sunday" },
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Theme</p>
            <Segmented
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
        </div>
      </Card>

      <div
        role="status"
        aria-live="polite"
        className="sticky bottom-20 z-10 flex min-h-12 items-center gap-2.5 rounded-3xl bg-surface/90 px-4 py-3 text-sm shadow-float backdrop-blur lg:bottom-4"
      >
        {validationError ? (
          <>
            <AlertCircle className="size-4 shrink-0 text-danger" aria-hidden />
            <span className="text-danger">Not saved yet — {validationError}</span>
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="size-4 shrink-0 text-danger" aria-hidden />
            <span className="text-danger">{error ?? "Couldn't save. Check your connection."}</span>
          </>
        ) : pending || status === "saving" || (key !== savedKey && key !== null) ? (
          <>
            <Spinner className="size-4 text-ink-3" />
            <span className="text-ink-2">Saving…</span>
          </>
        ) : status === "saved" ? (
          <>
            <CheckCircle2 className="size-4 shrink-0 text-mint" aria-hidden />
            <span className="text-ink-2">All changes saved</span>
          </>
        ) : (
          <span className="text-ink-3">Changes save automatically.</span>
        )}
      </div>
    </form>
  );
}
