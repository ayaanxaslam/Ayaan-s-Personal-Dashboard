-- =====================================================================
-- Personal Wellness Dashboard — profile details + food diary
--
-- Run AFTER 20261016000000_initial_schema.sql, in the Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- About you: optional age, height and weight (always stored in metric)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column age       smallint     check (age is null or age between 5 and 120),
  add column height_cm numeric(4, 1) check (height_cm is null or height_cm between 50 and 272),
  add column weight_kg numeric(4, 1) check (weight_kg is null or weight_kg between 10 and 400);

-- Display units for height and weight.
alter table public.user_settings
  add column body_units text not null default 'metric' check (body_units in ('metric', 'imperial'));

-- ---------------------------------------------------------------------
-- food_records (many entries per day)
-- ---------------------------------------------------------------------
create table public.food_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date  date not null,
  meal_type   text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drink')),
  description text not null check (char_length(btrim(description)) between 1 and 300),
  notes       text check (notes is null or char_length(notes) <= 500),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index food_records_user_date_idx on public.food_records (user_id, entry_date);

create trigger food_records_updated_at before update on public.food_records
  for each row execute function public.set_updated_at();

revoke all on public.food_records from anon;
grant select, insert, update, delete on public.food_records to authenticated;

alter table public.food_records enable row level security;

create policy "food_records_select_own" on public.food_records for select to authenticated using ((select auth.uid()) = user_id);
create policy "food_records_insert_own" on public.food_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "food_records_update_own" on public.food_records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "food_records_delete_own" on public.food_records for delete to authenticated using ((select auth.uid()) = user_id);
