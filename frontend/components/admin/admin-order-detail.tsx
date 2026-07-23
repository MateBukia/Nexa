"use client";

import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/orders/order-status";
import { orderApi } from "@/lib/order-api";
import type { Order, OrderStatus } from "@/types/order";
import { AdminError } from "./admin-overview";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};
const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    orderApi
      .one(orderId)
      .then(setOrder)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load order.",
        ),
      );
  }, [orderId]);
  async function update(status: OrderStatus) {
    if (!order || !window.confirm(`Move order to ${status}?`)) return;
    setUpdating(true);
    setError(null);
    try {
      setOrder(await orderApi.updateStatus(order.id, status));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update status.",
      );
    } finally {
      setUpdating(false);
    }
  }
  if (error && !order) return <AdminError message={error} />;
  if (!order)
    return <div className="h-80 animate-pulse rounded-2xl bg-white" />;
  const address = order.shippingAddress;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        {error && <AdminError message={error} />}
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div>
              <p className="text-sm text-slate-500">{order.orderNumber}</p>
              <p className="mt-1 font-semibold">
                {order.user.firstName} {order.user.lastName}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div className="flex justify-between gap-5 p-6" key={item.id}>
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.variantName} · {item.sku} · Qty {item.quantity}
                  </p>
                </div>
                <p className="font-semibold">
                  {money.format(Number(item.totalPrice))}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Update status</h2>
          <div className="mt-4 grid gap-2">
            {transitions[order.status].map((status) => (
              <button
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${status === "CANCELLED" || status === "REFUNDED" ? "border border-rose-200 text-rose-700" : "bg-slate-950 text-white"}`}
                disabled={updating}
                key={status}
                onClick={() => update(status)}
                type="button"
              >
                Mark {status.toLowerCase()}
              </button>
            ))}
            {!transitions[order.status].length && (
              <p className="text-sm text-slate-500">
                No further transitions available.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Delivery</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {address.firstName} {address.lastName}
            <br />
            {address.line1}
            <br />
            {address.city} {address.postalCode}
            <br />
            {address.country}
          </p>
        </section>
        <section className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{money.format(Number(order.grandTotal))}</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
