import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Brain,
  Droplet,
  Dumbbell,
  Footprints,
  Moon,
  Pencil,
  Sparkles,
  UserRound,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { Card, CardHeader, Eyebrow } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Ring } from "@/components/charts/ring";
import { SegmentedBar } from "@/components/charts/segmented-bar";
import { SleepColumns } from "@/components/charts/sleep-columns";
import {
  FoodDialogButton,
  MeditationDialogButton,
  SleepDialogButton,
  StepsDialogButton,
  WaterDialogButton,
  WorkoutDialogButton,
} from "@/components/trackers/dialog-buttons";
import { WaterQuickAdd } from "@/components/trackers/water-quick-add";
import { MEAL_LABELS, formatMinutes, formatNumber, formatWater, pct, workoutName } from "@/lib/format";
import { stepsToKm } from "@/lib/body";
import type { Tip, TipKind } from "@/lib/tips";
import { cn } from "@/lib/cn";
import type { FoodRecord, SleepRecord, StepRecord, UserSettings, WaterRecord, WorkoutRecord } from "@/lib/types";

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-ink"
      aria-label={label}
    >
      History <ArrowUpRight className="size-3.5" aria-hidden />
    </Link>
  );
}

function BigValue({ value, unit, sub }: { value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div>
      <p className="tabular text-3xl font-bold tracking-tight text-ink">
        {value}
        {unit ? <span className="ml-1 text-base font-semibold text-ink-3">{unit}</span> : null}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-ink-3">{sub}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------

export function SleepCard({
  today,
  settings,
  week,
  todayRecord,
  average,
  recordedNights,
}: {
  today: string;
  settings: UserSettings;
  week: Array<{ date: string; label: string; title: string; minutes: number | null; isToday: boolean }>;
  todayRecord: SleepRecord | null;
  average: number | null;
  recordedNights: number;
}) {
  const goal = settings.sleep_goal_minutes;
  return (
    <Card>
      <CardHeader
        title="Sleep"
        icon={<Moon className="size-[18px]" />}
        subtitle={`Goal ${formatMinutes(goal)}`}
        action={<MoreLink href="/activity/sleep" label="Sleep history" />}
      />
      <div className="mb-4 flex items-end justify-between gap-4">
        {todayRecord ? (
          <BigValue value={formatMinutes(todayRecord.duration_minutes)} sub="Last night" />
        ) : (
          <BigValue value="—" sub="Last night not logged" />
        )}
        <SleepDialogButton
          today={today}
          record={todayRecord}
          label={todayRecord ? "Edit" : "Log sleep"}
          title={todayRecord ? "Edit sleep" : "Log sleep"}
          variant="soft"
          size="sm"
          icon={todayRecord ? <Pencil className="size-3.5" aria-hidden /> : undefined}
        />
      </div>
      <SegmentedBar
        value={todayRecord ? pct(todayRecord.duration_minutes, goal) : 0}
        label="Last night's sleep towards goal"
        className="mb-6"
      />
      <SleepColumns days={week} goalMinutes={goal} />
      <p className="mt-4 text-xs text-ink-3">
        {average !== null ? (
          <>
            7-day average <span className="font-semibold text-ink">{formatMinutes(average)}</span> across {recordedNights} recorded{" "}
            {recordedNights === 1 ? "night" : "nights"}
          </>
        ) : (
          "No sleep recorded in the last 7 days."
        )}
      </p>
    </Card>
  );
}

export function StepsCard({
  today,
  settings,
  todayRecord,
  week,
  heightCm,
}: {
  today: string;
  settings: UserSettings;
  todayRecord: StepRecord | null;
  week: StepRecord[];
  heightCm: number | null;
}) {
  const steps = todayRecord?.steps ?? 0;
  const p = pct(steps, settings.step_goal);
  return (
    <Card>
      <CardHeader
        title="Steps"
        icon={<Footprints className="size-[18px]" />}
        subtitle={`Goal ${formatNumber(settings.step_goal)}`}
        action={<MoreLink href="/activity/steps" label="Step history" />}
      />
      <div className="flex items-center gap-5">
        <Ring value={p} label={`${p}% of step goal`} size={124} stroke={11}>
          <span className="tabular text-xl font-bold text-ink">{todayRecord ? formatNumber(steps) : "—"}</span>
          <span className="text-[10px] font-semibold tracking-wider text-ink-3 uppercase">{todayRecord ? `${p}%` : "No entry"}</span>
        </Ring>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-xs leading-relaxed text-ink-3">
            {todayRecord
              ? steps >= settings.step_goal
                ? "Goal reached today."
                : `${formatNumber(settings.step_goal - steps)} to go today.`
              : "Enter today's total from your phone or watch."}
            {todayRecord && heightCm ? (
              <span className="mt-1 block">≈ {stepsToKm(steps, heightCm).toFixed(1)} km, based on your height</span>
            ) : null}
          </p>
          <StepsDialogButton today={today} existing={week} label={todayRecord ? "Update" : "Add steps"} title="Steps" variant="soft" size="sm" />
        </div>
      </div>
    </Card>
  );
}

export function WaterCard({
  today,
  settings,
  totalMl,
  entries,
}: {
  today: string;
  settings: UserSettings;
  totalMl: number;
  entries: WaterRecord[];
}) {
  const unit = settings.water_unit;
  const p = pct(totalMl, settings.water_goal_ml);
  const last = entries.length ? entries[entries.length - 1] : null;
  return (
    <Card>
      <CardHeader
        title="Water"
        icon={<Droplet className="size-[18px]" />}
        subtitle={`Goal ${formatWater(settings.water_goal_ml, unit)}`}
        action={<MoreLink href="/activity/water" label="Water history" />}
      />
      <div className="mb-3 flex items-end justify-between gap-3">
        <BigValue
          value={formatWater(totalMl, unit)}
          sub={entries.length ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"} today · ${p}%` : "Nothing logged yet today"}
        />
        <WaterDialogButton today={today} unit={unit} label="Custom" title="Add water" variant="ghost" size="sm" />
      </div>
      <SegmentedBar value={p} segments={10} label="Water towards goal" className="mb-4" />
      <WaterQuickAdd today={today} increments={settings.water_increments_ml} unit={unit} lastEntryId={last?.id ?? null} />
    </Card>
  );
}

export function WorkoutCard({ today, workouts, weekCount, weekMinutes }: { today: string; workouts: WorkoutRecord[]; weekCount: number; weekMinutes: number }) {
  return (
    <Card>
      <CardHeader
        title="Workout"
        icon={<Dumbbell className="size-[18px]" />}
        subtitle={`${weekCount} completed in the last 7 days${weekMinutes ? ` · ${formatMinutes(weekMinutes)}` : ""}`}
        action={<MoreLink href="/activity/workouts" label="Workout history" />}
      />
      {workouts.length ? (
        <ul className="mb-4 space-y-2">
          {workouts.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3.5 py-2.5">
              <span className="text-sm font-semibold text-ink">{workoutName(w)}</span>
              <span className="text-xs text-ink-3">
                {w.duration_minutes ? formatMinutes(w.duration_minutes) : "No duration"} · {w.completed ? "Done" : "Planned"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="No workout logged today" className="mb-4" />
      )}
      <WorkoutDialogButton today={today} label="Add workout" title="Add workout" variant="soft" size="sm" />
    </Card>
  );
}

export function MeditationCard({ today, settings, minutes, sessions }: { today: string; settings: UserSettings; minutes: number; sessions: number }) {
  const p = pct(minutes, settings.meditation_goal_minutes);
  return (
    <Card>
      <CardHeader
        title="Meditation"
        icon={<Brain className="size-[18px]" />}
        subtitle={`Goal ${formatMinutes(settings.meditation_goal_minutes)}`}
        action={<MoreLink href="/activity/meditation" label="Meditation history" />}
      />
      <div className="flex items-center gap-5">
        <Ring value={p} label={`${p}% of meditation goal`} size={96} stroke={9} color="var(--mint)">
          <span className="tabular text-lg font-bold text-ink">{minutes ? formatMinutes(minutes) : "—"}</span>
        </Ring>
        <div className="space-y-3">
          <p className="text-xs text-ink-3">
            {sessions ? `${sessions} ${sessions === 1 ? "session" : "sessions"} today · ${p}%` : "No sessions yet today."}
          </p>
          <MeditationDialogButton today={today} label="Log session" title="Log meditation" variant="soft" size="sm" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------

export function SummaryTile({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-ink-3">
        <span aria-hidden>{icon}</span>
        <Eyebrow className="tracking-[0.08em]">{label}</Eyebrow>
      </div>
      <p className="tabular text-lg leading-tight font-bold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-ink-3">{sub}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------

const TIP_ICONS: Record<TipKind, LucideIcon> = {
  sleep: Moon,
  activity: Dumbbell,
  steps: Footprints,
  water: Droplet,
  food: Utensils,
  profile: UserRound,
};

export function TipsCard({ tips }: { tips: Tip[] }) {
  return (
    <Card>
      <CardHeader
        title="For you"
        icon={<Sparkles className="size-[18px]" />}
        subtitle="Based on your details and recent records"
        action={
          <Link
            href="/settings"
            className="inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          >
            About you <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        }
      />
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {tips.map((t) => {
          const Icon = TIP_ICONS[t.kind];
          return (
            <li key={t.kind + t.title} className="flex gap-3 rounded-2xl bg-surface-2 p-3.5">
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-xl bg-surface",
                  t.tone === "good" ? "text-mint" : "text-accent-strong",
                )}
                aria-hidden
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{t.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{t.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-ink-3">General guidance only — not medical advice.</p>
    </Card>
  );
}

export function FoodCard({ today, entries }: { today: string; entries: FoodRecord[] }) {
  return (
    <Card>
      <CardHeader
        title="Food today"
        icon={<Utensils className="size-[18px]" />}
        subtitle={entries.length ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}` : "Nothing logged yet"}
        action={<MoreLink href="/activity/food" label="Food history" />}
      />
      {entries.length ? (
        <ul className="mb-4 space-y-2">
          {entries.slice(-4).map((f) => (
            <li key={f.id} className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{MEAL_LABELS[f.meal_type]}</p>
              <p className="truncate text-sm text-ink">{f.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState compact title="What have you eaten today?" className="mb-4" />
      )}
      <FoodDialogButton today={today} label="Log food" title="Log food" variant="soft" size="sm" />
    </Card>
  );
}
