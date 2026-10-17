import "server-only";

// Basic in-memory sliding-window limiter. On serverless hosts each instance
// keeps its own window, so this is a best-effort guard against runaway
// usage rather than a hard quota.

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limits: Array<{ max: number; windowMs: number }>): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const longest = Math.max(...limits.map((l) => l.windowMs));
  const list = (hits.get(key) ?? []).filter((t) => now - t < longest);
  for (const { max, windowMs } of limits) {
    const inWindow = list.filter((t) => now - t < windowMs);
    if (inWindow.length >= max) {
      hits.set(key, list);
      return { ok: false, retryAfter: Math.ceil((windowMs - (now - inWindow[0])) / 1000) };
    }
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 1000) hits.delete(hits.keys().next().value!);
  return { ok: true };
}
