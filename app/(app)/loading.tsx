import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex items-center gap-3 text-ink-3">
        <Spinner label="Loading" />
        <span className="text-sm">Loading your data…</span>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-3xl bg-surface shadow-card" />
        ))}
      </div>
    </div>
  );
}
