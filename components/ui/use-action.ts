"use client";

import { useCallback, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/types";
import { useToast } from "./toast";

/**
 * Runs a Server Action inside a transition, reports the outcome with a
 * toast and exposes the pending state and last error.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const run = useCallback(
    (fn: () => Promise<ActionResult>, opts: { success?: string; onSuccess?: () => void; silentError?: boolean } = {}) =>
      new Promise<boolean>((resolve) => {
        setError(null);
        startTransition(async () => {
          let result: ActionResult;
          try {
            result = await fn();
          } catch {
            result = { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
          }
          if (result.ok) {
            if (opts.success) toast.success(opts.success);
            opts.onSuccess?.();
            resolve(true);
          } else {
            setError(result.error);
            if (!opts.silentError) toast.error(result.error);
            resolve(false);
          }
        });
      }),
    [toast],
  );

  return { run, pending, error, setError };
}
