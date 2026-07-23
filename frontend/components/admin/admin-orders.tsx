"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/orders/order-status";
import { orderApi } from "@/lib/order-api";
import type { Order, OrderStatus } from "@/types/order";
import { AdminError } from "./admin-overview";

const statuses: (OrderStatus | "")[] = [
  "",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];
const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    orderApi
      .all(status)
      .then((result) => setOrders(result.items))
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load orders.",
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
              {value || "All statuses"}
            </option>
          ))}
        </select>
      </div>
      {!orders ? (
        <div className="h-72 animate-pulse rounded-2xl bg-white" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Total</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4 font-semibold">
                    {order.orderNumber}
                  </td>
                  <td className="px-5 py-4">
                    <p>
                      {order.user.firstName} {order.user.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{order.user.email}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {money.format(Number(order.grandTotal))}
                  </td>
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="font-semibold text-emerald-700"
                      href={`/admin/orders/${order.id}`}
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && (
            <p className="p-10 text-center text-sm text-slate-500">
              No matching orders.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
