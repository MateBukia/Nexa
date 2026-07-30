"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { aiApi } from "@/lib/ai-api";
import type { ShoppingRecommendation } from "@/types/ai";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  recommendations?: ShoppingRecommendation[];
}

const examples = [
  "Show me headphones under 500 GEL.",
  "Find black products currently in stock.",
  "Compare these two products.",
  "Help me choose a gift.",
];
const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function ShoppingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error]);

  async function send(message: string, appendUserMessage = true) {
    const clean = message.trim();
    if (!clean || loading) return;
    if (appendUserMessage) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: clean },
      ]);
    }
    setLoading(true);
    setError(null);
    setFailedMessage(null);
    try {
      const response = await aiApi.shop(clean, sessionId);
      setSessionId(response.sessionId ?? undefined);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.message,
          recommendations: response.recommendations,
        },
      ]);
    } catch (caught) {
      setFailedMessage(clean);
      setError(
        caught instanceof Error ? caught.message : "Assistant is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setSessionId(undefined);
    setError(null);
    setFailedMessage(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void send(String(data.get("message")));
    form.reset();
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <section className="mb-3 flex h-[min(38rem,calc(100dvh-6.5rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 sm:w-100">
          <header className="flex items-center justify-between bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="font-semibold">Nexa shopping assistant</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Grounded in the live catalog
              </p>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  className="text-xs font-medium text-slate-300 hover:text-white disabled:opacity-50"
                  disabled={loading}
                  onClick={clearConversation}
                  type="button"
                >
                  Clear
                </button>
              )}
              <button
                aria-label="Close assistant"
                className="text-xl text-slate-400 hover:text-white"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
            {!messages.length && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-sm leading-6 text-slate-600">
                  Tell me what you need, your budget, or how you plan to use it.
                  I’ll search products and live variants.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {examples.map((example) => (
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs font-medium hover:border-emerald-500"
                      key={example}
                      onClick={() => void send(example)}
                      type="button"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                className={message.role === "user" ? "ml-10" : "mr-5"}
                key={message.id}
              >
                <div
                  className={`whitespace-pre-wrap wrap-break-word rounded-2xl p-3.5 text-sm leading-6 ${message.role === "user" ? "bg-emerald-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}
                >
                  {message.content}
                </div>
                {message.recommendations?.length ? (
                  <div className="mt-2 space-y-2">
                    {message.recommendations.map((product) => (
                      <Link
                        className="flex items-center gap-3 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200 hover:ring-emerald-400"
                        href={product.url}
                        key={product.productId}
                        onClick={() => setOpen(false)}
                      >
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            loading="lazy"
                            src={product.imageUrl}
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-semibold text-slate-500">
                            {product.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-950">
                            {product.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {product.reason}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold text-emerald-700">
                          {money.format(Number(product.price))}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading && (
              <div
                aria-live="polite"
                className="mr-20 animate-pulse rounded-2xl bg-white p-4 text-sm text-slate-400 ring-1 ring-slate-200"
              >
                Searching the catalog…
              </div>
            )}
            {error && (
              <div
                aria-live="assertive"
                className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
                role="alert"
              >
                <p>{error}</p>
                {failedMessage && (
                  <button
                    className="mt-2 font-semibold underline disabled:opacity-50"
                    disabled={loading}
                    onClick={() => void send(failedMessage, false)}
                    type="button"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>
          <form
            className="flex gap-2 border-t border-slate-200 bg-white p-3"
            onSubmit={submit}
          >
            <input
              aria-label="Ask the shopping assistant"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              disabled={loading}
              maxLength={1000}
              name="message"
              placeholder="What are you looking for?"
              required
            />
            <button
              className="rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              Send
            </button>
          </form>
        </section>
      )}
      <button
        className="ml-auto flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition hover:bg-emerald-700"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="text-emerald-300">✦</span>
        {open ? "Close" : "Ask Nexa"}
      </button>
    </div>
  );
}
