"use client";

import { useState } from "react";
import Link from "next/link";
import { cartApi } from "@/lib/cart-api";
import type { ProductVariant } from "@/types/catalog";

const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
  maximumFractionDigits: 2,
});

export function VariantPicker({ variants }: { variants: ProductVariant[] }) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "adding" | "added">("idle");
  const [error, setError] = useState<string | null>(null);
  const selected =
    variants.find((variant) => variant.id === selectedId) ?? variants[0];

  if (!selected) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        No purchasable options are available.
      </p>
    );
  }

  const available = Math.max(
    0,
    (selected.inventory?.quantity ?? 0) -
      (selected.inventory?.reservedQuantity ?? 0),
  );

  async function addToCart() {
    setStatus("adding");
    setError(null);
    try {
      await cartApi.add(selected.id, quantity);
      setStatus("added");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error ? caught.message : "Unable to add this item.",
      );
    }
  }

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-semibold tracking-[-0.04em]">
          {money.format(Number(selected.price))}
        </p>
        {selected.compareAtPrice && (
          <p className="text-base text-slate-400 line-through">
            {money.format(Number(selected.compareAtPrice))}
          </p>
        )}
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm font-semibold">Choose an option</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${selected.id === variant.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white hover:border-slate-600"}`}
              key={variant.id}
              onClick={() => {
                setSelectedId(variant.id);
                setQuantity(1);
                setStatus("idle");
                setError(null);
              }}
              type="button"
            >
              {variant.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <span
          className={`h-2.5 w-2.5 rounded-full ${available ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        <div>
          <p className="text-sm font-semibold">
            {available ? "Ready to order" : "Currently unavailable"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {available
              ? `${available} available · SKU ${selected.sku}`
              : `SKU ${selected.sku}`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <select
          aria-label="Quantity"
          className="rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold"
          disabled={!available}
          onChange={(event) => setQuantity(Number(event.target.value))}
          value={quantity}
        >
          {Array.from(
            { length: Math.min(available, 10) },
            (_, index) => index + 1,
          ).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button
          className="flex-1 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!available || status === "adding"}
          onClick={addToCart}
          type="button"
        >
          {status === "adding"
            ? "Adding…"
            : status === "added"
              ? "Added to cart"
              : "Add to cart"}
        </button>
      </div>
      {status === "added" && (
        <Link
          className="mt-3 inline-block text-sm font-semibold text-emerald-700"
          href="/cart"
        >
          View cart →
        </Link>
      )}
      {error && (
        <p className="mt-3 text-sm text-rose-700">
          {error}{" "}
          <Link className="font-semibold underline" href="/login">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
