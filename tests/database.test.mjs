// Applies the real migration to an in-process Postgres (PGlite) with a
// minimal stand-in for Supabase's auth schema, then checks Row Level
// Security, constraints and cascades. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
const migration = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(dir, f), "utf8")).join("\n");

test("database schema, RLS and constraints", async () => {
const db = new PGlite();
const ok = (cond, name) => assert.ok(cond, name);
async function expectError(fn, code, name) {
  let err = null;
  try { await fn(); } catch (e) { err = e; }
  assert.ok(err, `${name}: expected error ${code}, got success`);
  assert.equal(err.code, code, `${name}: ${err.message}`);
}

// Minimal stand-in for Supabase's auth schema and roles.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
// Simulate an existing user created before the migration (backfill path).
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.com')`);
await db.exec(migration);
await db.exec(`insert into auth.users (id, email) values ('${B}', 'b@example.com')`);

const as = async (uid, sql, params) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await db.query(sql, params); } finally { await db.exec(`reset role;`); }
};

const p = await db.query("select count(*)::int n from public.profiles");
const s = await db.query("select count(*)::int n from public.user_settings");
ok(p.rows[0].n === 2 && s.rows[0].n === 2, "backfill + trigger created profile and settings for both users");
const sa = await as(A, "select * from user_settings");
ok(sa.rows.length === 1 && sa.rows[0].user_id === A, "A sees only own settings");
ok(sa.rows[0].step_goal === 10000 && sa.rows[0].water_increments_ml.join() === "250,500,750", "defaults applied");

const h = await as(A, "insert into habits (name, start_date) values ('Reading', '2026-10-01') returning id, user_id");
const habitId = h.rows[0].id;
ok(h.rows[0].user_id === A, "user_id defaults to auth.uid()");
ok((await as(A, "select * from habits")).rows.length === 1, "A sees own habit");
ok((await as(B, "select * from habits")).rows.length === 0, "B cannot see A's habit");
ok((await as(B, "update habits set name='x' where id=$1 returning id", [habitId])).rows.length === 0, "B cannot update A's habit");
ok((await as(B, "delete from habits where id=$1 returning id", [habitId])).rows.length === 0, "B cannot delete A's habit");
await expectError(() => as(B, `insert into habits (user_id, name) values ('${A}', 'Sneaky')`), "42501", "B cannot insert a habit as A");

await as(A, "insert into habit_completions (habit_id, completed_on) values ($1, '2026-10-16')", [habitId]);
await expectError(() => as(A, "insert into habit_completions (habit_id, completed_on) values ($1, '2026-10-16')", [habitId]), "23505", "duplicate completion for same habit+date rejected");
const up = await as(A, "insert into habit_completions (habit_id, completed_on) values ($1, '2026-10-16') on conflict (habit_id, completed_on) do nothing returning id", [habitId]);
ok(up.rows.length === 0, "upsert with ignoreDuplicates is a no-op");
await expectError(() => as(B, "insert into habit_completions (habit_id, completed_on) values ($1, '2026-10-17')", [habitId]), "23503", "B cannot complete A's habit (composite FK)");
await expectError(() => as(B, `insert into habit_completions (user_id, habit_id, completed_on) values ('${A}', $1, '2026-10-17')`, [habitId]), "42501", "B cannot insert completion as A (RLS)");
ok((await as(B, "select * from habit_completions")).rows.length === 0, "B cannot see A's completions");

await as(A, "insert into sleep_records (sleep_date, duration_minutes) values ('2026-10-16', 450)");
await expectError(() => as(A, "insert into sleep_records (sleep_date, duration_minutes) values ('2026-10-16', 400)"), "23505", "one sleep record per day");
const upSleep = await as(A, "insert into sleep_records (sleep_date, duration_minutes) values ('2026-10-16', 400) on conflict (user_id, sleep_date) do update set duration_minutes = excluded.duration_minutes returning duration_minutes");
ok(upSleep.rows[0].duration_minutes === 400, "sleep upsert replaces same-day record");
await as(A, "insert into water_records (record_date, amount_ml) values ('2026-10-16', 250), ('2026-10-16', 500)");
ok((await as(A, "select sum(amount_ml)::int t from water_records")).rows[0].t === 750, "multiple water entries per day");
await as(A, "insert into meditation_records (session_date, duration_minutes) values ('2026-10-16', 10), ('2026-10-16', 5)");
ok((await as(A, "select count(*)::int n from meditation_records")).rows[0].n === 2, "multiple meditation sessions per day");
await as(A, "insert into workout_records (workout_date, activity_type, duration_minutes) values ('2026-10-16', 'football', 60), ('2026-10-16', 'gym', null)");
ok((await as(A, "select count(*)::int n from workout_records")).rows[0].n === 2, "multiple workouts, optional duration");
await expectError(() => as(A, "insert into step_records (record_date, steps) values ('2026-10-16', -5)"), "23514", "negative steps rejected");
await expectError(() => as(A, "insert into workout_records (workout_date, activity_type) values ('2026-10-16', 'swimming')"), "23514", "unknown activity type rejected");
await expectError(() => as(A, "update user_settings set water_increments_ml = '{0}'"), "23514", "invalid water increment rejected");
await expectError(() => as(A, "update user_settings set daily_goal_metrics = '{sleep,nonsense}'"), "23514", "invalid goal metric rejected");
await expectError(() => as(B, `insert into sleep_records (user_id, sleep_date, duration_minutes) values ('${A}', '2026-10-15', 400)`), "42501", "B cannot write A's sleep");
for (const t of ["sleep_records", "water_records", "meditation_records", "workout_records", "food_records", "user_settings", "profiles"]) {
  const rows = (await as(B, `select * from ${t}`)).rows;
  ok(rows.every((r) => (r.user_id ?? r.id) === B), `B only sees own rows in ${t}`);
}
ok((await as(B, "update sleep_records set duration_minutes = 1 returning id")).rows.length === 0, "B cannot update A's sleep");
await as(A, "insert into food_records (entry_date, meal_type, description) values ('2026-10-16', 'breakfast', 'Porridge'), ('2026-10-16', 'snack', 'Apple')");
ok((await as(A, "select count(*)::int n from food_records")).rows[0].n === 2, "multiple food entries per day");
ok((await as(B, "select * from food_records")).rows.length === 0, "B cannot see A's food diary");
ok((await as(B, "delete from food_records returning id")).rows.length === 0, "B cannot delete A's food");
await expectError(() => as(B, `insert into food_records (user_id, entry_date, meal_type, description) values ('${A}', '2026-10-16', 'lunch', 'x')`), "42501", "B cannot write A's food");
await expectError(() => as(A, "insert into food_records (entry_date, meal_type, description) values ('2026-10-16', 'brunch', 'x')"), "23514", "unknown meal type rejected");
await expectError(() => as(A, "insert into food_records (entry_date, meal_type, description) values ('2026-10-16', 'lunch', '   ')"), "23514", "blank food description rejected");
const prof = await as(A, "update profiles set age = 16, height_cm = 175.5, weight_kg = 62.3 returning age, height_cm, weight_kg");
ok(prof.rows.length === 1 && prof.rows[0].age === 16, "A can save age, height and weight");
ok((await as(B, "update profiles set age = 99 where id = $1 returning id", [A])).rows.length === 0, "B cannot change A's profile");
await expectError(() => as(A, "update profiles set age = 3"), "23514", "implausible age rejected");
await expectError(() => as(A, "update profiles set weight_kg = 900"), "23514", "implausible weight rejected");
await expectError(() => as(A, "update profiles set height_cm = 20"), "23514", "implausible height rejected");
await expectError(() => as(A, "update user_settings set body_units = 'stone'"), "23514", "unknown body units rejected");
ok((await as(B, "delete from water_records returning id")).rows.length === 0, "B cannot delete A's water");

await db.exec("set role anon;");
await expectError(() => db.query("select * from habits"), "42501", "anon has no table access");
await db.exec("reset role;");

await as(A, "delete from habits where id = $1", [habitId]);
ok((await db.query("select count(*)::int n from habit_completions")).rows[0].n === 0, "deleting habit removes its completions");
await db.exec(`delete from auth.users where id = '${A}'`);
const left = await db.query(`select (select count(*) from sleep_records)::int + (select count(*) from water_records)::int + (select count(*) from food_records)::int + (select count(*) from profiles where id='${A}')::int n`);
ok(left.rows[0].n === 0, "deleting the auth user removes all their data");

await db.close();
});
