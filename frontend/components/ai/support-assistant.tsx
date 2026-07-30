"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { aiApi } from "@/lib/ai-api";

interface Message {
  role: "user" | "assistant";
  text: string;
  ticket?: { id: string; ticketNumber: string } | null;
  ticketProposal?: {
    title: string;
    conversationSummary: string;
    suggestedCategory: string;
    priority: string;
    relatedOrderId: string | null;
  } | null;
}

const examples = ["Where is my latest order?", "How do I return a product?"];

export function SupportAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Ask about an order or store help. If the issue needs a person, I can open a ticket for you.",
    },
  ]);
  const [sessionId, setSessionId] = useState<string>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const response = await aiApi.support(message, sessionId);
      setSessionId(response.sessionId ?? undefined);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.message,
          ticket: response.ticket,
          ticketProposal: response.ticketProposal,
        },
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Support AI is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmTicket(messageIndex: number) {
    if (!sessionId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const ticket = await aiApi.confirmSupportTicket(sessionId);
      setMessages((current) =>
        current.map((message, index) =>
          index === messageIndex
            ? { ...message, ticket, ticketProposal: null }
            : message,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The ticket could not be created.",
      );
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-950 p-6 text-white shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
            AI support
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Get help now</h2>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
          Uses your orders
        </span>
      </div>
      <div className="mt-5 max-h-80 space-y-3 overflow-y-auto rounded-xl bg-white/5 p-4">
        {messages.map((message, index) => (
          <div
            className={
              message.role === "user"
                ? "ml-8 rounded-xl bg-emerald-400 p-3 text-sm text-emerald-950"
                : "mr-8 rounded-xl bg-white/10 p-3 text-sm leading-6"
            }
            key={`${message.role}-${index}`}
          >
            <p>{message.text}</p>
            {message.ticketProposal && (
              <div className="mt-3 rounded-lg border border-emerald-300/30 bg-slate-950/30 p-3">
                <p className="font-semibold">{message.ticketProposal.title}</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100">
                  {message.ticketProposal.conversationSummary}
                </p>
                <p className="mt-2 text-xs text-emerald-200">
                  {message.ticketProposal.suggestedCategory} ·{" "}
                  {message.ticketProposal.priority}
                </p>
                <button
                  className="mt-3 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-950 disabled:opacity-50"
                  disabled={loading}
                  onClick={() => void confirmTicket(index)}
                  type="button"
                >
                  Confirm and create ticket
                </button>
              </div>
            )}
            {message.ticket && (
              <Link
                className="mt-2 inline-block font-semibold text-emerald-300 underline"
                href={`/support/${message.ticket.id}`}
              >
                View ticket {message.ticket.ticketNumber}
              </Link>
            )}
          </div>
        ))}
        {loading && (
          <p className="text-sm text-emerald-200">
            Checking your account context…
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            className="rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
            key={example}
            onClick={() => void send(example)}
            type="button"
          >
            {example}
          </button>
        ))}
      </div>
      <form className="mt-4 flex gap-2" onSubmit={submit}>
        <input
          className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-emerald-200 focus:border-emerald-300"
          maxLength={1000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask a support question…"
          value={input}
        />
        <button
          className="rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-emerald-950 disabled:opacity-50"
          disabled={loading || input.trim().length < 2}
          type="submit"
        >
          Send
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-rose-200">
          {error}{" "}
          <Link className="underline" href="/login?next=/support">
            Sign in
          </Link>
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-emerald-200">
        AI answers can be mistaken. Confirm important return, refund, or
        delivery details with a support agent.
      </p>
    </section>
  );
}
