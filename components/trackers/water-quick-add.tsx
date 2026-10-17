"use client";

import { Plus, Undo2 } from "lucide-react";
import { addWater, deleteWater } from "@/app/actions/trackers";
import { useAction } from "@/components/ui/use-action";
import { formatWater } from "@/lib/format";
import type { WaterUnit } from "@/lib/types";

/** One-tap buttons for the configured water increments, plus undo. */
export function WaterQuickAdd({
  today,
  increments,
  unit,
  lastEntryId,
}: {
  today: string;
  increments: number[];
  unit: WaterUnit;
  lastEntryId: string | null;
}) {
  const { run, pending } = useAction();
  return (
    <div className="flex flex-wrap gap-2">
      {increments.map((ml) => (
        <button
          key={ml}
          type="button"
          disabled={pending}
          onClick={() => run(() => addWater({ date: today, amountMl: ml }), { success: `Added ${formatWater(ml, unit)}` })}
          className="inline-flex h-9 items-center gap-1 rounded-xl bg-accent-soft px-3 text-xs font-semibold text-accent-strong transition hover:brightness-95 disabled:opacity-50"
        >
          <Plus className="size-3.5" aria-hidden />
          {formatWater(ml, unit)}
        </button>
      ))}
      {lastEntryId ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => deleteWater(lastEntryId), { success: "Removed last entry" })}
          className="inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-ink-3 transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          aria-label="Undo last water entry"
        >
          <Undo2 className="size-3.5" aria-hidden /> Undo
        </button>
      ) : null}
    </div>
  );
}
