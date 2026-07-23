"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TicketStatusBadge } from "@/components/support/ticket-status";
import { supportApi } from "@/lib/support-api";
import type { SupportTicket } from "@/types/support";
import { AdminError } from "./admin-overview";

const statuses = [
  "",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export function SupportInbox() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supportApi
      .inbox(status)
      .then((result) => setTickets(result.items))
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load support inbox.",
        ),
      );
  }, [status]);
  if (error) return <AdminError message={error} />;

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <select
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
          onChange={(event) => setStatus(event.target.value)}
          value={status}
        >
          {statuses.map((value) => (
            <option key={value || "all"} value={value}>
              {value ? value.replaceAll("_", " ") : "All tickets"}
            </option>
          ))}
        </select>
      </div>
      {!tickets ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 md:grid-cols-[1fr_auto_auto] md:items-center"
              href={`/admin/support/${ticket.id}`}
              key={ticket.id}
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold">{ticket.subject}</p>
                  <span
                    className={`text-xs font-semibold ${ticket.priority === "URGENT" || ticket.priority === "HIGH" ? "text-rose-700" : "text-slate-400"}`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {ticket.ticketNumber} · {ticket.customer.firstName}{" "}
                  {ticket.customer.lastName} · {ticket._count?.messages ?? 0}{" "}
                  messages
                </p>
              </div>
              <TicketStatusBadge status={ticket.status} />
              <div className="text-xs text-slate-400 md:text-right">
                <p>
                  {ticket.assignee
                    ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                    : "Unassigned"}
                </p>
                <p className="mt-1">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </div>
            </Link>
          ))}
          {!tickets.length && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              No matching support tickets.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
