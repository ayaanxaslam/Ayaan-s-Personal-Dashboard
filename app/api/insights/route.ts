import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSettings, loadRecords } from "@/lib/data";
import { addDays, dateInTimeZone, resolveTimeZone, startOfWeek, todayInTimeZone } from "@/lib/dates";
import { buildIndex } from "@/lib/metrics";
import { buildContext, detectTopics, detectWindowDays, SYSTEM_PROMPT } from "@/lib/ai/context";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 24_000;
const MAX_QUESTION = 1000;
const MAX_HISTORY = 6;
const MAX_HISTORY_CHARS = 3000;
const DEFAULT_MODEL = "gpt-5-mini";

type ChatTurn = { role: "user" | "assistant"; content: string };

function fail(status: number, error: string, code?: string) {
  return NextResponse.json({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

function parseBody(raw: unknown): { question: string; history: ChatTurn[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const { question, history } = raw as Record<string, unknown>;
  if (typeof question !== "string") return null;
  const q = question.trim();
  if (!q || q.length > MAX_QUESTION) return null;
  const turns: ChatTurn[] = [];
  if (Array.isArray(history)) {
    for (const t of history.slice(-MAX_HISTORY)) {
      if (!t || typeof t !== "object") continue;
      const { role, content } = t as Record<string, unknown>;
      if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim())
        turns.push({ role, content: content.slice(0, MAX_HISTORY_CHARS) });
    }
  }
  return { question: q, history: turns };
}

/** Explains whether AI insights are configured, without revealing anything else. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail(401, "Please sign in.");
  return NextResponse.json({ configured: Boolean(process.env.OPENAI_API_KEY) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  // 1. Configuration and authentication.
  if (!getSupabaseEnv()) return fail(503, "Supabase is not configured.");
  const user = await getSessionUser();
  if (!user) return fail(401, "Your session has expired. Please sign in again.", "unauthenticated");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return fail(
      503,
      "AI insights need an OpenAI API key. Add OPENAI_API_KEY to your environment variables and restart the app.",
      "ai_not_configured",
    );

  // 2. Validate the request.
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return fail(413, "That message is too long.");
  if (!req.headers.get("content-type")?.includes("application/json")) return fail(415, "Expected JSON.");
  let body: ReturnType<typeof parseBody>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, "That message is too long.");
    body = parseBody(JSON.parse(text));
  } catch {
    body = null;
  }
  if (!body) return fail(400, `Ask a question of up to ${MAX_QUESTION} characters.`);

  // 3. Basic rate limiting per user.
  const limited = rateLimit(`insights:${user.id}`, [
    { max: 8, windowMs: 60_000 },
    { max: 100, windowMs: 86_400_000 },
  ]);
  if (!limited.ok)
    return NextResponse.json(
      { error: `You're asking quickly — try again in ${limited.retryAfter}s.`, code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );

  // 4. Retrieve only the relevant records, as the signed-in user (RLS applies).
  let context: ReturnType<typeof buildContext>;
  try {
    const supabase = await createClient();
    const settings = await getSettings(supabase, user.id);
    const timeZone = resolveTimeZone(settings.timezone);
    const today = todayInTimeZone(timeZone);
    const profile = await getProfile(supabase, user.id);
    const trackingStart = profile?.created_at ? dateInTimeZone(profile.created_at, timeZone) : addDays(today, -365);

    const topics = detectTopics(body.question);
    const windowDays = detectWindowDays(body.question);
    // Always reach back to the start of last week so week-on-week comparisons work.
    const lastWeekStart = addDays(startOfWeek(today, settings.week_starts_on), -7);
    const from = [addDays(today, -(windowDays - 1)), lastWeekStart].sort()[0];

    const wants = new Set(topics);
    const records = await loadRecords(supabase, user.id, from, today, {
      sleep: wants.has("sleep"),
      steps: wants.has("steps"),
      water: wants.has("water"),
      workouts: wants.has("workouts"),
      meditation: wants.has("meditation"),
      food: wants.has("food"),
    });
    // Streaks need a longer look-back than the window, but only the derived numbers are sent.
    if (wants.has("habits")) {
      const longer = await loadRecords(supabase, user.id, addDays(today, -366), today, { completions: true });
      records.completions = longer.completions;
    }
    const idx = buildIndex(records);
    context = buildContext({ records, idx, settings, today, from, timeZone, topics, trackingStart, profile });
  } catch (err) {
    console.error("Insights data retrieval failed:", err instanceof Error ? err.message : "unknown");
    return fail(500, "Couldn't load your records. Please try again.");
  }

  // 5. Ask OpenAI. The key stays on the server; only the question, recent
  // chat turns and the summarised records are sent.
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const isReasoningModel = /^(gpt-5|o\d)/.test(model);
  try {
    const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 45_000 });
    const response = await client.responses.create({
      model,
      instructions: SYSTEM_PROMPT,
      input: [
        ...body.history.map((t) => ({ role: t.role, content: t.content })),
        {
          role: "user" as const,
          content: `DATA (retrieved from my records for this question):\n${context.text}\n\nQUESTION: ${body.question}`,
        },
      ],
      max_output_tokens: isReasoningModel ? 4000 : 1200,
      ...(isReasoningModel ? { reasoning: { effort: "low" as const } } : {}),
      store: false,
    });
    const answer = response.output_text?.trim();
    if (!answer) return fail(502, "The AI didn't return an answer. Please try again.");
    return NextResponse.json({ answer, meta: context.meta, model }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error("OpenAI request failed:", err.status, err.code ?? "");
      if (err.status === 401) return fail(502, "OpenAI rejected the API key. Check OPENAI_API_KEY.", "ai_auth");
      if (err.status === 404) return fail(502, `The model "${model}" isn't available to this API key. Set OPENAI_MODEL to one that is.`, "ai_model");
      if (err.status === 429) return fail(503, "OpenAI's rate limit or quota was reached. Try again later or check your billing.", "ai_quota");
      return fail(502, "The AI service returned an error. Please try again.", "ai_error");
    }
    console.error("OpenAI request failed:", err instanceof Error ? err.name : "unknown");
    return fail(502, "Couldn't reach the AI service. Please try again.", "ai_unreachable");
  }
}
