import { dateRange, formatShortDate, formatRelativeDay, formatWeekdayShort } from "./dates";
import type { BarDatum } from "@/components/charts/bar-chart";

/** Bar data for each day in a range; days without a value stay null. */
export function dailyBars(map: Map<string, number>, from: string, to: string, today: string): BarDatum[] {
  const days = dateRange(from, to);
  const short = days.length <= 7;
  return days.map((date) => ({
    key: date,
    label: short ? formatWeekdayShort(date).slice(0, 2) : formatShortDate(date).split(" ")[0],
    title: formatRelativeDay(date, today),
    value: map.has(date) ? map.get(date)! : null,
  }));
}
