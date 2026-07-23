"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { supportApi } from "@/lib/support-api";
import type { SupportTicket, TicketStatus } from "@/types/support";
import { TicketStatusBadge } from "./ticket-status";

const transitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: ["OPEN"],
};

export function TicketConversation({
  ticketId,
  staff = false,
}: {
  ticketId: string;
  staff?: boolean;
}) {
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const load = useCallback(
    () =>
      supportApi
        .one(ticketId)
        .then(setTicket)
        .catch((caught: unknown) =>
          setError(
            caught instanceof Error ? caught.message : "Unable to load ticket.",
          ),
        ),
    [ticketId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function reply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      setTicket(
        await supportApi.message(
          ticketId,
          String(data.get("body")).trim(),
          data.get("isInternal") === "on",
        ),
      );
      form.reset();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to send message.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function updateStatus(status: TicketStatus) {
    setWorking(true);
    setError(null);
    try {
      setTicket(await supportApi.status(ticketId, status));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update ticket.",
      );
    } finally {
      setWorking(false);
    }
  }
  async function assign() {
    setWorking(true);
    setError(null);
    try {
      setTicket(await supportApi.assignSelf(ticketId));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to assign ticket.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (error && !ticket)
    return <p className="rounded-2xl bg-rose-50 p-6 text-rose-800">{error}</p>;
  if (!ticket)
    return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">{ticket.ticketNumber}</p>
              <h1 className="mt-1 text-xl font-semibold">{ticket.subject}</h1>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </div>
        </header>
        <div className="space-y-5 bg-slate-50 p-5 sm:p-6">
          {ticket.messages?.map((message) => {
            const customer = message.senderType === "CUSTOMER";
            return (
              <article
                className={`max-w-[85%] rounded-2xl p-4 ${message.isInternal ? "ml-auto border border-amber-200 bg-amber-50" : customer ? "bg-white ring-1 ring-slate-200" : "ml-auto bg-slate-950 text-white"}`}
                key={message.id}
              >
                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="font-semibold">
                    {message.isInternal
                      ? "Internal note"
                      : message.author
                        ? `${message.author.firstName} ${message.author.lastName}`
                        : message.senderType.replaceAll("_", " ")}
                  </span>
                  <span
                    className={
                      customer || message.isInternal
                        ? "text-slate-400"
                        : "text-slate-500"
                    }
                  >
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
                <p
                  className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${customer || message.isInternal ? "text-slate-600" : "text-slate-200"}`}
                >
                  {message.body}
                </p>
              </article>
            );
          })}
        </div>
        {ticket.status !== "CLOSED" && (
          <form className="border-t border-slate-200 p-5" onSubmit={reply}>
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"
              minLength={1}
              name="body"
              placeholder={
                staff ? "Write a reply or internal note…" : "Write a reply…"
              }
              required
            />
            {staff && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <input name="isInternal" type="checkbox" /> Internal note
              </label>
            )}
            {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
            <div className="mt-3 flex justify-end">
              <button
                className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={working}
                type="submit"
              >
                {working ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        )}
      </section>
      <aside className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Ticket details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-400">Priority</dt>
              <dd className="mt-1 font-semibold">{ticket.priority}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Created</dt>
              <dd className="mt-1">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </dd>
            </div>
            {ticket.order && (
              <div>
                <dt className="text-slate-400">Related order</dt>
                <dd className="mt-1">
                  <Link
                    className="font-semibold text-emerald-700"
                    href={
                      staff
                        ? `/admin/orders/${ticket.order.id}`
                        : `/orders/${ticket.order.id}`
                    }
                  >
                    {ticket.order.orderNumber}
                  </Link>
                </dd>
              </div>
            )}
            {staff && (
              <div>
                <dt className="text-slate-400">Customer</dt>
                <dd className="mt-1">
                  {ticket.customer.firstName} {ticket.customer.lastName}
                  <br />
                  <span className="text-xs text-slate-400">
                    {ticket.customer.email}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">Assigned to</dt>
              <dd className="mt-1">
                {ticket.assignee
                  ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                  : "Unassigned"}
              </dd>
            </div>
          </dl>
        </div>
        {staff && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">Actions</h2>
            {!ticket.assignee && (
              <button
                className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                disabled={working}
                onClick={assign}
                type="button"
              >
                Assign to me
              </button>
            )}
            <div className="mt-3 grid gap-2">
              {transitions[ticket.status].map((status) => (
                <button
                  className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-semibold hover:border-emerald-500"
                  disabled={working}
                  key={status}
                  onClick={() => updateStatus(status)}
                  type="button"
                >
                  Move to {status.replaceAll("_", " ").toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
