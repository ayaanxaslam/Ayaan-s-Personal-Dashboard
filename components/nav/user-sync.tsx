"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectTimezone, syncThemeCookie } from "@/app/actions/settings";
import type { ThemePreference } from "@/lib/types";

/**
 * Keeps per-device state in step with the saved settings:
 *  - records the browser's timezone the first time (when none is saved),
 *  - applies the saved theme if this device's cookie is out of date.
 */
export function UserSync({ timezone, theme }: { timezone: string | null; theme: ThemePreference }) {
  const router = useRouter();

  useEffect(() => {
    if (timezone) return;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    detectTimezone(tz).then((r) => {
      if (r.ok) router.refresh();
    });
  }, [timezone, router]);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.theme !== theme) {
      root.dataset.theme = theme;
      void syncThemeCookie(theme);
    }
  }, [theme]);

  return null;
}
