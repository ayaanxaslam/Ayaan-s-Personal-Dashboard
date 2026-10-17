// Supabase connection settings. Every Supabase call in this app runs on the
// server, so either naming style works:
//   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY   (Supabase's usual names)
//   SUPABASE_URL / SUPABASE_ANON_KEY                           (without the prefix)
// The publishable key name (…_PUBLISHABLE_KEY) is accepted in place of the anon key.
// Secret keys (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are never read here.

function first(...values: Array<string | undefined>): string | undefined {
  return values.map((v) => v?.trim()).find((v) => v);
}

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = first(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL);
  const anonKey = first(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
  );
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
