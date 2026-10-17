export function parseRange<T extends number>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (allowed as readonly number[]).includes(n) ? (n as T) : fallback;
}
