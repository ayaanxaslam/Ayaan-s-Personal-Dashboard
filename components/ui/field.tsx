import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "h-11 w-full rounded-2xl bg-surface-2 px-3.5 text-sm text-ink placeholder:text-ink-3 outline-none ring-1 ring-transparent transition focus:bg-surface focus:ring-accent disabled:opacity-60 aria-[invalid=true]:ring-danger";

export const textareaClass =
  "min-h-20 w-full rounded-2xl bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-ink-3 outline-none ring-1 ring-transparent transition focus:bg-surface focus:ring-accent";

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      {message}
    </p>
  );
}
