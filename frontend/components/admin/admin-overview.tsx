"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { DashboardAnalytics } from "@/types/analytics";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "GEL",
  maximumFractionDigits: 0,
});

export function AdminOverview() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    adminApi
      .analytics()
      .then(setData)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load analytics.",
        ),
      );
  }, []);
  if (error) return <AdminError message={error} />;
  if (!data) return <div className="h-60 animate-pulse rounded-2xl bg-white" />;

  const change = data.sales.changePercent;
  const cards = [
    {
      label: "30-day sales",
      value: money.format(data.sales.revenue),
      note:
        change === null
          ? "No prior-period baseline"
          : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs previous 30 days`,
    },
    {
      label: "30-day orders",
      value: data.sales.orders,
      note: `${data.totals.orders} all time`,
    },
    {
      label: "Customers",
      value: data.totals.customers,
      note: `${data.totals.activeProducts} active products`,
    },
    {
      label: "Support queue",
      value: data.totals.openSupport,
      note: "Open or awaiting action",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            className="rounded-2xl border border-slate-200 bg-white p-6"
            key={card.label}
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-slate-400">{card.note}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <MetricBars title="Orders by status" items={data.ordersByStatus} />
        <MetricBars
          title="Support tickets by status"
          items={data.supportByStatus}
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Top products</h2>
            <span className="text-xs text-slate-400">Units sold</span>
          </div>
          <div className="mt-5 space-y-4">
            {data.topProducts.map((product, index) => (
              <div
                className="flex items-center justify-between gap-4"
                key={`${product.productId}-${product.productName}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {product.productName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {money.format(product.revenue)}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold">{product.units}</span>
              </div>
            ))}
            {!data.topProducts.length && (
              <Empty text="No completed sales data yet." />
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Low-stock warnings</h2>
            <Link
              className="text-xs font-semibold text-emerald-700"
              href="/admin/inventory"
            >
              Manage inventory
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.lowStock.map((item) => (
              <div
                className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 p-3"
                key={item.inventoryId}
              >
                <div>
                  <p className="text-sm font-semibold">{item.productName}</p>
                  <p className="text-xs text-slate-500">
                    {item.variantName} · {item.sku}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${item.available <= 0 ? "text-rose-700" : "text-amber-700"}`}
                >
                  {item.available} left
                </span>
              </div>
            ))}
            {!data.lowStock.length && (
              <Empty text="All inventory is above its warning threshold." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricBars({
  title,
  items,
}: {
  title: string;
  items: { status: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.status}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span>{item.status.replaceAll("_", " ")}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {!items.length && <Empty text="No records yet." />}
      </div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
      {text}
    </p>
  );
}
export function AdminError({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
      {message}
    </p>
  );
}
