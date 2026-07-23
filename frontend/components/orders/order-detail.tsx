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

export function OrderDetail({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  if (error)
    return <p className="rounded-2xl bg-rose-50 p-6 text-rose-800">{error}</p>;
  if (!order)
    return <div className="h-80 animate-pulse rounded-2xl bg-white" />;
  const address = order.shippingAddress;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <p className="text-sm text-slate-500">Order number</p>
            <p className="mt-1 text-xl font-semibold">{order.orderNumber}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div className="flex justify-between gap-6 p-6" key={item.id}>
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.variantName} · {item.sku} · Qty {item.quantity}
                </p>
                {item.productId && (
                  <Link
                    className="mt-2 inline-block text-xs font-semibold text-emerald-700"
                    href={`/products/${item.productId}`}
                  >
                    View product
                  </Link>
                )}
              </div>
              <p className="font-semibold">
                {money.format(Number(item.totalPrice))}
              </p>
            </div>
          ))}
        </div>
      </section>
      <aside className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Shipping to</h2>
          <address className="mt-3 text-sm not-italic leading-6 text-slate-500">
            {address.firstName} {address.lastName}
            <br />
            {address.line1}
            {address.line2 && (
              <>
                <br />
                {address.line2}
              </>
            )}
            <br />
            {address.city}
            {address.region ? `, ${address.region}` : ""} {address.postalCode}
            <br />
            {address.country}
          </address>
        </div>
        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Subtotal</span>
            <span>{money.format(Number(order.subtotal))}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-4 font-semibold">
            <span>Total</span>
            <span>{money.format(Number(order.grandTotal))}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
