import { ActivityTabs } from "@/components/nav/activity-tabs";

export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Activity</h1>
      <p className="mb-5 text-sm text-ink-3">Log and review sleep, steps, water, workouts, meditation and food.</p>
      <ActivityTabs />
      {children}
    </div>
  );
}
