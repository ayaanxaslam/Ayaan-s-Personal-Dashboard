"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, Info, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/dates";

type Meta = { from: string; to: string; days: number; datasets: Array<{ name: string; records: number }> };
type Message =
  | { id: number; role: "user"; content: string }
  | { id: number; role: "assistant"; content: string; meta?: Meta }
  | { id: number; role: "error"; content: string };

const SUGGESTIONS = [
  "Summarise my progress this week.",
  "Which habits have I completed most consistently?",
  "Compare this week with last week.",
  "How has my recorded sleep changed?",
  "Summarise my workout activity.",
  "What patterns can you identify in my habits?",
  "What practical changes might help me stay consistent?",
  "What do my meals look like this week?",
  "Is my sleep right for my age?",
];

/** Renders **bold**, bullet lists and paragraphs without injecting HTML. */
function RichText({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    );
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          const ordered = /^\s*\d+\./.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={cn("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
              ))}
            </Tag>
          );
        }
        if (/^#{1,4}\s/.test(lines[0]))
          return (
            <div key={i}>
              <p className="font-semibold text-ink">{inline(lines[0].replace(/^#{1,4}\s/, ""))}</p>
              {lines.slice(1).map((l, j) => (
                <p key={j}>{inline(l)}</p>
              ))}
            </div>
          );
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j ? <br /> : null}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function InsightsChat({ configured }: { configured: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    if (q.length > 1000) {
      setMessages((m) => [...m, { id: nextId.current++, role: "error", content: "Please keep questions under 1,000 characters." }]);
      return;
    }
    const history = messages
      .filter((m): m is Extract<Message, { role: "user" | "assistant" }> => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { id: nextId.current++, role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history }),
      });
      const data = (await res.json().catch(() => ({}))) as { answer?: string; meta?: Meta; error?: string };
      if (!res.ok || !data.answer) {
        setMessages((m) => [
          ...m,
          { id: nextId.current++, role: "error", content: data.error ?? "Something went wrong. Please try again." },
        ]);
      } else {
        setMessages((m) => [...m, { id: nextId.current++, role: "assistant", content: data.answer!, meta: data.meta }]);
      }
    } catch {
      setMessages((m) => [...m, { id: nextId.current++, role: "error", content: "Couldn't reach the server. Check your connection." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section aria-labelledby="chat-heading" className="flex h-[640px] max-h-[80dvh] flex-col overflow-hidden rounded-3xl bg-surface shadow-card">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-2xl bg-ink text-surface" aria-hidden>
            <Sparkles className="size-[18px]" />
          </span>
          <div>
            <h2 id="chat-heading" className="text-[15px] font-semibold text-ink">
              Ask about your data
            </h2>
            <p className="text-xs text-ink-3">Answers use only records retrieved from your account.</p>
          </div>
        </div>
        {messages.length ? (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <RotateCcw className="size-3.5" aria-hidden /> New chat
          </button>
        ) : null}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {!configured ? (
          <div className="flex gap-3 rounded-2xl bg-surface-2 p-4 text-sm text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
            <p>
              AI insights need an OpenAI API key. Add <code className="rounded bg-surface px-1 text-xs">OPENAI_API_KEY</code> to your
              environment variables (see README) and restart the app. Everything else on the dashboard works without it.
            </p>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div>
            <p className="mb-3 text-sm text-ink-2">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!configured || loading}
                  onClick={() => ask(s)}
                  className="rounded-2xl bg-surface-2 px-3 py-2 text-left text-xs font-medium text-ink-2 transition hover:bg-accent-soft hover:text-accent-strong disabled:opacity-50 disabled:hover:bg-surface-2 disabled:hover:text-ink-2"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-sm whitespace-pre-wrap text-surface">{m.content}</p>
            </div>
          ) : m.role === "assistant" ? (
            <div key={m.id} className="max-w-[92%]">
              <div className="rounded-3xl rounded-bl-lg bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2">
                <RichText text={m.content} />
              </div>
              {m.meta ? (
                <p className="mt-1.5 px-2 text-[11px] text-ink-3">
                  Based on {formatShortDate(m.meta.from)} – {formatShortDate(m.meta.to)}:{" "}
                  {m.meta.datasets.map((d) => `${d.records} ${d.name.toLowerCase()}`).join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <p key={m.id} role="alert" className="max-w-[92%] rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
              {m.content}
            </p>
          ),
        )}

        {loading ? (
          <div className="flex items-center gap-1.5 px-2 py-1" aria-label="Analysing your records">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
            <span className="ml-2 text-xs text-ink-3">Reading your records…</span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-line p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl bg-surface-2 p-1.5 focus-within:ring-1 focus-within:ring-accent">
          <label htmlFor="chat-input" className="sr-only">
            Ask a question about your data
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            maxLength={1000}
            value={input}
            disabled={!configured}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder={configured ? "Ask about your habits, sleep, workouts…" : "AI insights aren't configured"}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink-3"
          />
          <button
            type="submit"
            disabled={!configured || loading || !input.trim()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-surface transition hover:opacity-90 disabled:opacity-30"
            aria-label="Send question"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        <p className="mt-2 px-2 text-[10px] text-ink-3">
          Your question and a summary of the relevant records are sent to OpenAI. Not medical advice.
        </p>
      </form>
    </section>
  );
}
