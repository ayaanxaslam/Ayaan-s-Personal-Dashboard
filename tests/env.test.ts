import { test } from "node:test";
import assert from "node:assert/strict";
import { getSupabaseEnv } from "../lib/env";

const KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
];

function withEnv(vars: Record<string, string>, fn: () => void) {
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  try {
    fn();
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test("env: Supabase settings work with or without the NEXT_PUBLIC_ prefix", () => {
  withEnv({ SUPABASE_URL: "https://a.supabase.co", SUPABASE_ANON_KEY: "anon" }, () =>
    assert.deepEqual(getSupabaseEnv(), { url: "https://a.supabase.co", anonKey: "anon" }),
  );
  withEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://b.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon2" }, () =>
    assert.deepEqual(getSupabaseEnv(), { url: "https://b.supabase.co", anonKey: "anon2" }),
  );
  withEnv({ SUPABASE_URL: "https://c.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" }, () =>
    assert.equal(getSupabaseEnv()?.anonKey, "sb_publishable_x"),
  );
  withEnv({ SUPABASE_URL: "https://d.supabase.co" }, () => assert.equal(getSupabaseEnv(), null));
  withEnv({ SUPABASE_URL: "  ", SUPABASE_ANON_KEY: "k" }, () => assert.equal(getSupabaseEnv(), null));
});
