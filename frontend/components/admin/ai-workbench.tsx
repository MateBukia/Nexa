"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { aiApi } from "@/lib/ai-api";
import { supportApi } from "@/lib/support-api";
import type { Product } from "@/types/catalog";
import type { SupportTicket } from "@/types/support";

const field =
  "mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500";

export function AiWorkbench({ isAdmin }: { isAdmin: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [result, setResult] = useState<unknown>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const requests: Promise<unknown>[] = [
      supportApi.inbox().then((value) => setTickets(value.items)),
    ];
    if (isAdmin)
      requests.push(
        adminApi.products().then((value) => setProducts(value.items)),
      );
    Promise.all(requests).catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : "Unable to load AI tools.",
      ),
    );
  }, [isAdmin]);

  async function run(action: () => Promise<unknown>) {
    setWorking(true);
    setError(null);
    setResult(null);
    try {
      setResult(await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI request failed.");
    } finally {
      setWorking(false);
    }
  }

  function productCopy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      aiApi.productCopy(
        String(data.get("notes")),
        String(data.get("tone")) || undefined,
      ),
    );
  }
  function reviewSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() =>
      aiApi.reviewSummary(
        String(new FormData(event.currentTarget).get("productId")),
      ),
    );
  }
  function replyDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(() =>
      aiApi.supportReply(
        String(data.get("ticketId")),
        String(data.get("guidance")) || undefined,
      ),
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {isAdmin && (
        <>
          <form
            className="rounded-2xl border border-slate-200 bg-white p-6"
            onSubmit={productCopy}
          >
            <h2 className="text-lg font-semibold">Generate product copy</h2>
            <p className="mt-2 text-sm text-slate-500">
              Turn factual notes into editable catalog copy.
            </p>
            <label className="mt-5 block text-sm font-medium">
              Rough notes
              <textarea
                className={`${field} min-h-32`}
                minLength={10}
                name="notes"
                required
              />
            </label>
            <label className="mt-4 block text-sm font-medium">
              Tone
              <input
                className={field}
                name="tone"
                placeholder="Clear, premium, practical"
              />
            </label>
            <Action working={working} />
          </form>
          <form
            className="rounded-2xl border border-slate-200 bg-white p-6"
            onSubmit={reviewSummary}
          >
            <h2 className="text-lg font-semibold">Summarize product reviews</h2>
            <p className="mt-2 text-sm text-slate-500">
              Analyze up to 100 real published reviews.
            </p>
            <label className="mt-5 block text-sm font-medium">
              Product
              <select className={field} name="productId" required>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <Action working={working} />
          </form>
        </>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Recurring support issues</h2>
        <p className="mt-2 text-sm text-slate-500">
          Analyze the latest 100 tickets without customer identity data.
        </p>
        <button
          className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={working}
          onClick={() => void run(aiApi.supportIssues)}
          type="button"
        >
          Generate summary
        </button>
      </section>
      <form
        className="rounded-2xl border border-slate-200 bg-white p-6"
        onSubmit={replyDraft}
      >
        <h2 className="text-lg font-semibold">Draft support reply</h2>
        <p className="mt-2 text-sm text-slate-500">
          Uses the real ticket and linked order. Review before sending.
        </p>
        <label className="mt-5 block text-sm font-medium">
          Ticket
          <select className={field} name="ticketId" required>
            <option value="">Select ticket</option>
            {tickets.map((ticket) => (
              <option key={ticket.id} value={ticket.id}>
                {ticket.ticketNumber} — {ticket.subject}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium">
          Staff guidance
          <textarea className={`${field} min-h-20`} name="guidance" />
        </label>
        <Action working={working} />
      </form>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 xl:col-span-2">
        <h2 className="font-semibold text-emerald-950">Generated draft</h2>
        {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
        {result ? (
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-white p-5 text-sm leading-6 text-slate-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 text-sm text-emerald-800">
            Run a tool to see its editable result here.
          </p>
        )}
      </section>
    </div>
  );
}

function Action({ working }: { working: boolean }) {
  return (
    <button
      className="mt-5 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      disabled={working}
      type="submit"
    >
      {working ? "Generating…" : "Generate draft"}
    </button>
  );
}
