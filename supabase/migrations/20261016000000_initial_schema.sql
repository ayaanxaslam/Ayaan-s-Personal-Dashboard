-- =====================================================================
-- Personal Wellness Dashboard — initial schema
--
-- Apply by pasting this whole file into the Supabase SQL Editor and
-- pressing "Run" (see README.md). It is safe to run on a fresh project.
--
-- Conventions
--   * Every user-owned row carries user_id -> auth.users(id).
--   * Calendar dates are stored as `date` and represent the user's LOCAL
--     calendar day (in user_settings.timezone). The app computes "today"
--     in that timezone before reading or writing.
--   * Timestamps (created_at/updated_at) are timestamptz (UTC).
--   * Row Level Security is enabled on every table; users can only touch
--     their own rows. The anon role gets no table privileges at all.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- user_settings (one row per user)
-- ---------------------------------------------------------------------
create table public.user_settings (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  step_goal               integer  not null default 10000 check (step_goal between 100 and 100000),
  sleep_goal_minutes      integer  not null default 480   check (sleep_goal_minutes between 60 and 1080),
  water_goal_ml           integer  not null default 2500  check (water_goal_ml between 100 and 10000),
  meditation_goal_minutes integer  not null default 10    check (meditation_goal_minutes between 1 and 600),
  water_unit              text     not null default 'ml'  check (water_unit in ('ml', 'l', 'fl_oz')),
  water_increments_ml     integer[] not null default '{250,500,750}'
    check (cardinality(water_increments_ml) between 1 and 6
           and 1 <= all (water_increments_ml)
           and 5000 >= all (water_increments_ml)),
  -- IANA timezone, e.g. 'Europe/London'. NULL until the app detects it.
  timezone                text     check (timezone is null or char_length(timezone) between 1 and 64),
  week_starts_on          smallint not null default 1 check (week_starts_on in (0, 1)),
  theme                   text     not null default 'system' check (theme in ('light', 'dark', 'system')),
  -- Which tracker goals count towards "Goals reached today" (habits always count).
  daily_goal_metrics      text[]   not null default '{sleep,steps,water,meditation}'
    check (daily_goal_metrics <@ array['sleep', 'steps', 'water', 'meditation', 'workout']::text[]),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------
create table public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 60),
  icon          text check (icon is null or char_length(icon) between 1 and 40),
  schedule_type text not null default 'daily' check (schedule_type in ('daily', 'custom')),
  -- Days of week the habit is due, 0 = Sunday … 6 = Saturday.
  schedule_days smallint[] not null default '{0,1,2,3,4,5,6}'
    check (cardinality(schedule_days) between 1 and 7
           and schedule_days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  -- First local day the habit counts towards progress.
  start_date    date not null default current_date,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Lets habit_completions reference (id, user_id) so a completion can
  -- never point at someone else's habit.
  unique (id, user_id)
);
create index habits_user_idx on public.habits (user_id, sort_order);

-- ---------------------------------------------------------------------
-- habit_completions (one row per habit per local day)
-- ---------------------------------------------------------------------
create table public.habit_completions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id     uuid not null,
  completed_on date not null,
  created_at   timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade,
  unique (habit_id, completed_on)
);
create index habit_completions_user_date_idx on public.habit_completions (user_id, completed_on);

-- ---------------------------------------------------------------------
-- sleep_records (one per user per local day; the day you woke up)
-- ---------------------------------------------------------------------
create table public.sleep_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sleep_date       date not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  quality          smallint check (quality is null or quality between 1 and 5),
  notes            text check (notes is null or char_length(notes) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, sleep_date)
);

-- ---------------------------------------------------------------------
-- step_records (one per user per local day)
-- ---------------------------------------------------------------------
create table public.step_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  record_date date not null,
  steps       integer not null check (steps between 0 and 200000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, record_date)
);

-- ---------------------------------------------------------------------
-- water_records (many entries per day; always stored in millilitres)
-- ---------------------------------------------------------------------
create table public.water_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  record_date date not null,
  amount_ml   integer not null check (amount_ml between 1 and 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index water_records_user_date_idx on public.water_records (user_id, record_date);

-- ---------------------------------------------------------------------
-- workout_records (many per day)
-- ---------------------------------------------------------------------
create table public.workout_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workout_date     date not null,
  activity_type    text not null
    check (activity_type in ('football', 'walking', 'running', 'gym', 'cycling', 'other')),
  activity_label   text check (activity_label is null or char_length(activity_label) between 1 and 60),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  notes            text check (notes is null or char_length(notes) <= 1000),
  completed        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index workout_records_user_date_idx on public.workout_records (user_id, workout_date);

-- ---------------------------------------------------------------------
-- meditation_records (many per day)
-- ---------------------------------------------------------------------
create table public.meditation_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_date     date not null,
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  notes            text check (notes is null or char_length(notes) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index meditation_records_user_date_idx on public.meditation_records (user_id, session_date);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create trigger profiles_updated_at           before update on public.profiles           for each row execute function public.set_updated_at();
create trigger user_settings_updated_at      before update on public.user_settings      for each row execute function public.set_updated_at();
create trigger habits_updated_at             before update on public.habits             for each row execute function public.set_updated_at();
create trigger sleep_records_updated_at      before update on public.sleep_records      for each row execute function public.set_updated_at();
create trigger step_records_updated_at       before update on public.step_records       for each row execute function public.set_updated_at();
create trigger water_records_updated_at      before update on public.water_records      for each row execute function public.set_updated_at();
create trigger workout_records_updated_at    before update on public.workout_records    for each row execute function public.set_updated_at();
create trigger meditation_records_updated_at before update on public.meditation_records for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Create profile + settings rows automatically for new auth users
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for any user created before this migration ran.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
insert into public.user_settings (user_id) select id from auth.users on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- Privileges: signed-in users only. anon gets nothing.
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.user_settings, public.habits, public.habit_completions,
  public.sleep_records, public.step_records, public.water_records, public.workout_records,
  public.meditation_records from anon;

grant select, insert, update, delete on public.profiles, public.user_settings, public.habits,
  public.habit_completions, public.sleep_records, public.step_records, public.water_records,
  public.workout_records, public.meditation_records to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.user_settings      enable row level security;
alter table public.habits             enable row level security;
alter table public.habit_completions  enable row level security;
alter table public.sleep_records      enable row level security;
alter table public.step_records       enable row level security;
alter table public.water_records      enable row level security;
alter table public.workout_records    enable row level security;
alter table public.meditation_records enable row level security;

-- profiles: keyed on id
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Every other table is keyed on user_id. Generate the four policies per table.
do $$
declare
  t text;
begin
  foreach t in array array['user_settings', 'habits', 'habit_completions', 'sleep_records',
                           'step_records', 'water_records', 'workout_records', 'meditation_records']
  loop
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t || '_delete_own', t);
  end loop;
end;
$$;
