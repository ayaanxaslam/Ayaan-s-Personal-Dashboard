import { Activity, LayoutGrid, CircleCheckBig, Settings, Sparkles, type LucideIcon } from "lucide-react";

export const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/habits", label: "Habits", icon: CircleCheckBig },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
