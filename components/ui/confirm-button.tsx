"use client";

import { useState, type ReactNode } from "react";
import type { ActionResult } from "@/lib/types";
import { Button, type ButtonProps } from "./button";
import { Dialog } from "./dialog";
import { useAction } from "./use-action";

/** A button that asks for confirmation before running a destructive action. */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = "Delete",
  successMessage,
  children,
  onDone,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "children" | "action"> & {
  action: () => Promise<ActionResult>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  successMessage?: string;
  children: ReactNode;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending } = useAction();

  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => !pending && setOpen(false)} title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={async () => {
              const ok = await run(action, { success: successMessage });
              if (ok) {
                setOpen(false);
                onDone?.();
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
