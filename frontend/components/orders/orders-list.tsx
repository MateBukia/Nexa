"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { orderApi } from "@/lib/order-api";
import type { Order } from "@/types/order";
import { OrderStatusBadge } from "./order-status";

const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function OrdersList() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    orderApi
      .mine()
      .then((result) => setOrders(result.items))
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load orders.",
        ),
      );
  }, []);

  if (error)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold">Sign in to view your orders.</p>
        <p className="mt-2 text-sm text-amber-800">{error}</p>
        <Link
          className="mt-5 inline-block font-semibold text-emerald-700"
          href="/login?next=/orders"
        >
          Sign in →
        </Link>
      </div>
    );
  if (!orders)
    return <div className="h-72 animate-pulse rounded-2xl bg-white" />;
  if (!orders.length)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-xl font-semibold">No orders yet.</p>
        <Link
          className="mt-5 inline-block font-semibold text-emerald-700"
          href="/products"
        >
          Start shopping →
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link
          className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-400 sm:flex-row sm:items-center"
          href={`/orders/${order.id}`}
          key={order.id}
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-semibold">{order.orderNumber}</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {new Date(order.createdAt).toLocaleDateString()} ·{" "}
              {order.items.length} lines
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-semibold">
              {money.format(Number(order.grandTotal))}
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              View details →
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
