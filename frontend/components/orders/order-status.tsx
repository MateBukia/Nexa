import type { OrderStatus } from "@/types/order";

const tones: Record<OrderStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-sky-50 text-sky-700",
  PROCESSING: "bg-violet-50 text-violet-700",
  SHIPPED: "bg-indigo-50 text-indigo-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  REFUNDED: "bg-rose-50 text-rose-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
