# Personal Wellness Dashboard

A private wellness and habit tracker for one person: habits with streaks, sleep, steps, water, workouts, meditation and a food diary, personalised tips from your age, height and weight, history charts, and an AI chat that answers questions about your own records.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + Row Level Security) · OpenAI Responses API · Vercel

---

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Greeting, date, perfect-day streak, settings link. Dotted semicircle gauge for “Goals reached today” (habits due today plus the tracker goals you choose), yesterday’s %, today’s summary (habits, sleep, steps, water, workout, meditation), today’s habit checklist, cards for each tracker, a **Food today** card, and a **For you** card with personalised tips. |
| **Habits** | Create, edit and delete habits with a name, optional icon, and an every-day or selected-days schedule. Mark done / undo with instant feedback. 30-day history grid (tap any day to fix it), current and best streaks, 30-day consistency. |
| **Activity** | Overview plus a page each for Sleep, Steps, Water, Workouts, Meditation and **Food**: add, edit and delete records, weekly charts, averages, and history. The food diary records the meal (breakfast, lunch, dinner, snack or drink), what you had, the date and optional notes. |
| **Insights** | 7/30/90-day range selector. Daily goal completion, weekly habit completion, most consistent habits, sleep, steps, water, workout and meditation charts. AI chat about your data. |
| **Settings** | **About you**: age, height and weight (all optional, in cm/kg or ft/in/lb), with suggested goals for your age that you can apply in one tap. Step, sleep, water and meditation goals. Which goals count towards the daily gauge. Water unit (ml/L, litres, fl oz) and quick-add amounts. Timezone, week start, theme (system/light/dark), display name. Saved in Supabase, so they follow you across devices. |

### How the numbers work

- **Dates.** Every record stores your *local* calendar date. “Today” is worked out in the timezone saved in Settings (detected from your browser the first time). Older records are never overwritten when the date changes.
- **Missing data stays missing.** Days you didn’t log appear as empty markers in charts, not zero. Averages count only the days you logged, and the page says how many that was.
- **Habit %** = habits completed ÷ habits due that day. Days before a habit’s “tracking since” date, and days it isn’t scheduled, don’t count.
- **Habit streak** = consecutive *scheduled* days completed. If today is due but not done yet, the streak still stands.
- **Day streak** (dashboard header) = consecutive days on which every scheduled habit was done.
- **Goals reached today** = habits due today plus the tracker goals you’ve ticked in Settings (sleep, steps, water and meditation by default; workout is optional).
- **Sleep** is logged against the day you woke up.
- **Steps** are entered by hand. The app does **not** read Apple Health or Apple Watch data.
- **Personalised tips** compare your logged data with published guidance for your age: sleep hours from the American Academy of Sleep Medicine and CDC, activity from the WHO (60 minutes a day under 18, 150 minutes a week for adults), and a rough drinks guide of about 33 ml per kg of body weight. Your height is used to estimate walking distance from steps. With too little data, a tip asks you to log more instead of guessing. The app deliberately doesn’t show BMI or set calorie targets.

---

## 1. Create the Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**. Pick a name, a strong database password and a region near you.
2. When it’s ready, open **Project Settings → API** (on newer projects this is **API Keys**) and note down:
   - the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - the **anon** key (or the **publishable** key, `sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   You do **not** need the service-role or secret key. The app runs every query as you, the signed-in user, so Row Level Security always applies.

## 2. Apply the database migrations

Saving the SQL files in this repository does **not** create anything in Supabase. You have to run them once, **in this order**:

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste in the whole of [`supabase/migrations/20261016000000_initial_schema.sql`](supabase/migrations/20261016000000_initial_schema.sql) and click **Run**. It should finish with “Success. No rows returned”.
3. Open another **New query**, paste in [`supabase/migrations/20261017000000_profile_details_and_food.sql`](supabase/migrations/20261017000000_profile_details_and_food.sql) and click **Run**.
4. Check **Table Editor**: you should see `profiles`, `user_settings`, `habits`, `habit_completions`, `sleep_records`, `step_records`, `water_records`, `workout_records`, `meditation_records` and `food_records`, each with RLS enabled.

The migration:

- creates the ten tables, with foreign keys, indexes, check constraints and unique constraints (one completion per habit per day, one sleep record and one step total per day, many water/workout/meditation/food entries per day), plus optional age, height and weight on your profile;
- enables Row Level Security on every table, with select/insert/update/delete policies limited to `auth.uid() = user_id`;
- takes all table privileges away from the `anon` role;
- adds a trigger that creates your `profiles` and `user_settings` rows when your user is created, and backfills them for any user who already exists.

> If you use the Supabase CLI instead, `supabase db push` applies the same file.

## 3. Configure authentication

This is a single-user app, so there’s no public sign-up page.

1. **Authentication → Sign In / Providers → Email**: make sure Email is enabled.
2. **Authentication → Sign In / Providers**: turn **off** “Allow new users to sign up”. This stops anyone else creating an account.
3. **Authentication → Users → Add user → Create new user**: enter your email and a strong password, and tick **Auto Confirm User**.
4. Once it’s deployed, also set **Authentication → URL Configuration → Site URL** to your Vercel URL.

Your email and password are never stored in this code. You sign in on the `/login` page.

## 4. Environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Required | Where it’s used |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server. Public by design. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server. Public by design; RLS protects the data. |
| `OPENAI_API_KEY` | For AI chat only | **Server only** (`app/api/insights/route.ts`). Without it, everything else works and the chat shows a setup message. |
| `OPENAI_MODEL` | No (default `gpt-5-mini`) | Server only. Any model your OpenAI account can use with the Responses API. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Not used** | Leave it out. Nothing in this app needs it. |

`.env.local` is git-ignored. Only `.env.example`, which holds no secrets, is committed.

## 5. Run locally

Requires Node.js 20.9 or later (developed on Node 22).

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with the user you created in step 3.

Other scripts:

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

`npm test` runs:

- unit tests for dates, timezones, streaks, daily goals, averages, AI dataset selection, unit conversions, age-based guidance and personalised tips;
- tests for the AI context builder (it contains only retrieved records and no free-text notes);
- a database test that applies the real migration to an in-process Postgres ([PGlite](https://pglite.dev)) with a stand-in `auth` schema, then checks RLS isolation between two users (including the food diary and profile details), that `anon` is blocked, duplicate prevention, constraints and cascades.

## 6. Push to GitHub

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "Initial commit"
```

Create an **empty private** repository on GitHub (no README or .gitignore), then:

```bash
git remote add origin https://github.com/<you>/<repo>.git
```

```bash
git branch -M main
```

```bash
git push -u origin main
```

Before your first push, check that `git status` doesn’t list `.env.local`.

## 7. Connect GitHub to Vercel

1. At [vercel.com](https://vercel.com), click **Add New → Project** and import the repository. Vercel detects Next.js; leave the build settings as they are.
2. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and, if you want AI insights, `OPENAI_API_KEY` (plus `OPENAI_MODEL` if you want a different model). Add them for **Production** and, if you use preview deployments, **Preview** too.

## 8. Deploy

1. Click **Deploy**. Every later push to `main` redeploys automatically.
2. In Supabase, set **Authentication → URL Configuration → Site URL** to the Vercel URL.
3. Open the site and sign in.

---

## Security

- **Row Level Security** on every table. Each user can read and write only rows where `user_id = auth.uid()`. Habit completions reference `(habit_id, user_id)`, so a completion can’t be attached to someone else’s habit.
- **Server-side checks.** Every Server Action and the API route re-verify the session (`getClaims()` validates the JWT), validate their input, and scope updates and deletes to the user’s own id. Future dates are rejected.
- **No secrets in the browser.** The OpenAI key is read only in the API route. The service-role key isn’t used at all.
- **AI data minimisation.** The chat route works out which datasets a question needs and how much history (up to 90 days). It loads only those, and sends OpenAI pre-computed statistics and daily values, plus your age, height and weight if you’ve entered them, and the text of food entries when you ask about food. It never sends notes, emails, ids or credentials, and it never runs SQL from the user. The prompt also tells the AI not to comment on body size, give dieting or calorie advice, or (for under-18s) give any weight-related advice. Requests are size-limited and rate-limited (8 per minute, 100 per day per user), and are sent with `store: false`.
- **Proxy** (`proxy.ts`, Next 16’s name for middleware) refreshes the Supabase session cookie and redirects signed-out visitors. Pages still verify the user themselves.
- Basic security headers are set in `next.config.ts`, and the site is marked `noindex`.

## Project structure

```
app/
  (app)/            Signed-in pages: dashboard, habits, activity/*, insights, settings
  actions/          Server Actions (habits, trackers, settings, auth)
  api/insights/     POST: AI chat · GET: whether AI is configured
  login/            Sign-in page
components/         UI primitives, charts (dot gauge, ring, bars, line), feature components
lib/
  data.ts           Server data access (per-request user context, paged queries)
  metrics.ts        Pure progress/streak/average calculations
  dates.ts          Timezone-aware local-date helpers
  ai/               Topic detection, context builder and system prompt for the chat
  supabase/         Server client and proxy session refresh
supabase/migrations SQL schema + RLS
tests/              Unit and database tests (npm test)
proxy.ts            Session refresh + optimistic auth redirect
```

## Known limitations

- **Manual entry only.** Steps, sleep and the rest are typed in. There’s no Apple Health, Google Fit or wearable sync.
- **Goals aren’t versioned.** Past days’ goal checks (sleep/steps/water/meditation) use your *current* goals, so changing a goal changes historical percentages.
- **Weight is a single value**, not a log over time. Updating it replaces the old number.
- **The food diary has no calorie or nutrient counting.** It’s a written log for spotting patterns.
- **Deleting a habit deletes its history**, after a confirmation. There’s no archive.
- **Rate limiting is per server instance.** It’s held in memory, so on Vercel it’s a best-effort guard rather than a strict quota. OpenAI’s own account limits still apply.
- **Streaks look back one year.** Longer streaks are capped at what a year of history shows.
- **Daily goal percentages start on the day your account was created.** Records you backdate to before then still appear in the charts, but those days get no percentage.
- **The AI chat doesn’t stream.** Answers appear when they’re complete, and the chat isn’t saved between visits.
- The design follows the brief’s description (pale blue-white background, navy text, turquoise and mint accents, dotted semicircle gauge, segmented bars). No reference screenshot was attached, so it hasn’t been compared against one.
