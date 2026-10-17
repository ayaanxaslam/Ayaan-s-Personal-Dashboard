// Public Supabase settings. These are safe in the browser by design — the
// anon/publishable key only grants what Row Level Security allows.
// Secret keys (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) are never read here.

export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
