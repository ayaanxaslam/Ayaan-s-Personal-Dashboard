import type { Metadata } from "next";
import { ListChecks, Plus } from "lucide-react";
import { getUserContext, loadRecords } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { buildIndex, habitDayStats, habitStreak, habitsDueOn, isCompleted } from "@/lib/metrics";
import { buildHabitRows } from "@/lib/habit-rows";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NewHabitButton } from "@/components/trackers/dialog-buttons";
import { HabitBoard } from "@/components/habits/habit-board";
import { HabitChecklist } from "@/components/habits/habit-checklist";

export const metadata: Metadata = { title: "Habits" };

export default async function HabitsPage() {
  const { supabase, user, today } = await getUserContext();
  // A year of completions is enough for streaks; the board shows 30 days.
  const records = await loadRecords(supabase, user.id, addDays(today, -400), today, { completions: true });
  const idx = buildIndex(records);
  const rows = buildHabitRows(idx, today, 30);
  const due = habitsDueOn(idx.habits, today);
  const stats = habitDayStats(idx, today);

  const newHabit = (
    <NewHabitButton today={today} label="New habit" title="New habit" description="Create a habit to track each day." />
  );

  return (
    <div className="animate-fade-up">
      <PageHeader title="Habits" description="Build routines that stick, one day at a time." action={newHabit} />

      {idx.habits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks className="size-5" />}
            title="No habits yet"
            description="Create your first habit — reading, studying, football practice, anything you want to do regularly."
            action={
              <NewHabitButton today={today} label="Create a habit" title="New habit" icon={<Plus className="size-4" aria-hidden />} />
            }
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section aria-labelledby="history-heading" className="order-2 xl:order-1">
            <h2 id="history-heading" className="mb-3 px-1 text-sm font-semibold text-ink-2">
              History · last 30 days
            </h2>
            <HabitBoard rows={rows} today={today} />
          </section>
          <div className="order-1 xl:order-2">
            <Card className="xl:sticky xl:top-8">
              <CardHeader
                title="Today"
                subtitle={stats.due ? `${stats.done} of ${stats.due} done` : "Nothing scheduled today"}
              />
              {due.length ? (
                <HabitChecklist
                  compact
                  date={today}
                  habits={due.map((h) => ({
                    id: h.id,
                    name: h.name,
                    icon: h.icon,
                    done: isCompleted(idx, h.id, today),
                    streak: habitStreak(h, idx, today),
                  }))}
                />
              ) : (
                <EmptyState compact title="A rest day" description="None of your habits are scheduled for today." />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
