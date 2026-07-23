import type { TicketStatus } from "@/types/support";

const tones: Record<TicketStatus, string> = {
  OPEN: "bg-sky-50 text-sky-700",
  IN_PROGRESS: "bg-violet-50 text-violet-700",
  WAITING_FOR_CUSTOMER: "bg-amber-50 text-amber-700",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
