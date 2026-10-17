// Small input validators for Server Actions and API routes. Server Actions
// are public endpoints, so every argument is treated as untrusted.

import { addDays, isIsoDate } from "./dates";

export class ValidationError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, label = "Record"): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new ValidationError(`${label} not found.`);
  return value;
}

/** A local date that is not in the future and not absurdly old. */
export function requireDate(value: unknown, today: string, label = "Date"): string {
  if (typeof value !== "string" || !isIsoDate(value)) throw new ValidationError(`${label} is not a valid date.`);
  if (value > today) throw new ValidationError(`${label} can't be in the future.`);
  if (value < addDays(today, -3650)) throw new ValidationError(`${label} is too far in the past.`);
  return value;
}

export function requireInt(value: unknown, min: number, max: number, label: string): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n))
    throw new ValidationError(`${label} must be a whole number.`);
  if (n < min || n > max) throw new ValidationError(`${label} must be between ${min} and ${max}.`);
  return n;
}

export function optionalInt(value: unknown, min: number, max: number, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  return requireInt(value, min, max, label);
}

export function optionalText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new ValidationError(`${label} is invalid.`);
  const t = value.trim();
  if (!t) return null;
  if (t.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`);
  return t;
}

export function requireText(value: unknown, max: number, label: string): string {
  const t = optionalText(value, max, label);
  if (!t) throw new ValidationError(`${label} is required.`);
  return t;
}

export function requireOneOf<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) throw new ValidationError(`${label} is invalid.`);
  return value as T;
}

export function requireBool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new ValidationError(`${label} is invalid.`);
  return value;
}
