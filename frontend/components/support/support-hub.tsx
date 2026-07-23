"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { orderApi } from "@/lib/order-api";
import { supportApi } from "@/lib/support-api";
import type { Order } from "@/types/order";
import type { SupportTicket } from "@/types/support";
import { TicketStatusBadge } from "./ticket-status";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function SupportHub() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    Promise.all([supportApi.mine(), orderApi.mine()])
      .then(([ticketResult, orderResult]) => {
        setTickets(ticketResult.items);
        setOrders(orderResult.items);
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load support.",
        ),
      );
  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const ticket = await supportApi.create({
        subject: String(data.get("subject")).trim(),
        message: String(data.get("message")).trim(),
        priority: String(data.get("priority")),
        orderId: String(data.get("orderId") ?? "") || undefined,
      });
      form.reset();
      window.location.href = `/support/${ticket.id}`;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create ticket.",
      );
      setSubmitting(false);
    }
  }

  if (error && !tickets)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold">Sign in to contact support.</p>
        <p className="mt-2 text-sm text-amber-800">{error}</p>
        <Link
          className="mt-5 inline-block font-semibold text-emerald-700"
          href="/login?next=/support"
        >
          Sign in →
        </Link>
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <form
        className="h-fit rounded-2xl border border-slate-200 bg-white p-6"
        onSubmit={create}
      >
        <h2 className="text-xl font-semibold">Start a conversation</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Tell us what happened and include the relevant order when possible.
        </p>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Subject
            <input
              className={inputClass}
              maxLength={180}
              name="subject"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Related order
            <select className={inputClass} name="orderId">
              <option value="">No specific order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Priority
            <select
              className={inputClass}
              defaultValue="NORMAL"
              name="priority"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            How can we help?
            <textarea
              className={`${inputClass} min-h-36`}
              minLength={10}
              name="message"
              required
            />
          </label>
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <button
            className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Creating…" : "Create ticket"}
          </button>
        </div>
      </form>
      <section>
        <h2 className="text-xl font-semibold">Your tickets</h2>
        <div className="mt-5 space-y-3">
          {!tickets ? (
            <div className="h-64 animate-pulse rounded-2xl bg-white" />
          ) : tickets.length ? (
            tickets.map((ticket) => (
              <Link
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400"
                href={`/support/${ticket.id}`}
                key={ticket.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">{ticket.subject}</p>
                  <TicketStatusBadge status={ticket.status} />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {ticket.ticketNumber} · {ticket._count?.messages ?? 0}{" "}
                  messages · Updated{" "}
                  {new Date(ticket.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              No support conversations yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
