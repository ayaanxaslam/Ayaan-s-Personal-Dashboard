-- =====================================================================
-- handle_new_user() only runs as a trigger on auth.users. Remove the
-- default EXECUTE grant so it isn't exposed through the API
-- (Supabase security advisor lint 0028/0029).
-- =====================================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
