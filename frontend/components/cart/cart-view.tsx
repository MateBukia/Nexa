"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductMedia } from "@/components/catalog/product-media";
import { cartApi } from "@/lib/cart-api";
import type { Cart } from "@/types/cart";

const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function CartView() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  useEffect(() => {
    cartApi
      .get()
      .then(setCart)
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your cart.",
        );
      });
  }, []);

  async function changeQuantity(itemId: string, quantity: number) {
    setBusyItem(itemId);
    setError(null);
    try {
      setCart(await cartApi.update(itemId, quantity));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update quantity.",
      );
    } finally {
      setBusyItem(null);
    }
  }

  async function remove(itemId: string) {
    setBusyItem(itemId);
    setError(null);
    try {
      await cartApi.remove(itemId);
      setCart(await cartApi.get());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to remove item.",
      );
    } finally {
      setBusyItem(null);
    }
  }

  if (error && !cart) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold text-amber-950">
          Sign in to open your saved cart.
        </p>
        <p className="mt-2 text-sm text-amber-800">{error}</p>
        <Link
          className="mt-5 inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
          href="/login?next=/cart"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!cart) return <div className="h-80 animate-pulse rounded-3xl bg-white" />;
  if (!cart.items.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
        <p className="text-2xl font-semibold tracking-[-0.03em]">
          Your cart is ready for something good.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Browse the catalog and choose a product option to begin.
        </p>
        <Link
          className="mt-7 inline-block rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          href="/products"
        >
          Explore products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </p>
        )}
        {cart.items.map((item) => (
          <article
            className="grid grid-cols-[6rem_1fr] gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center"
            key={item.id}
          >
            <Link
              className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100"
              href={`/products/${item.product.slug}`}
            >
              <ProductMedia
                alt={item.product.image?.altText ?? item.product.name}
                src={item.product.image?.url}
              />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {item.product.category.name}
              </p>
              <Link
                className="mt-1 block truncate font-semibold hover:text-emerald-700"
                href={`/products/${item.product.slug}`}
              >
                {item.product.name}
              </Link>
              <p className="mt-1 text-sm text-slate-500">
                {item.variant.name} · {item.variant.sku}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <select
                  aria-label={`Quantity for ${item.product.name}`}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  disabled={busyItem === item.id}
                  onChange={(event) =>
                    changeQuantity(item.id, Number(event.target.value))
                  }
                  value={item.quantity}
                >
                  {Array.from(
                    { length: Math.min(item.variant.availableQuantity, 99) },
                    (_, index) => index + 1,
                  ).map((quantity) => (
                    <option key={quantity} value={quantity}>
                      {quantity}
                    </option>
                  ))}
                </select>
                <button
                  className="text-xs font-semibold text-slate-400 hover:text-rose-700"
                  disabled={busyItem === item.id}
                  onClick={() => remove(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
            <p className="col-start-2 font-semibold sm:col-auto sm:self-start sm:pt-2">
              {money.format(item.lineTotal)}
            </p>
          </article>
        ))}
      </div>

      <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <div className="mt-6 flex justify-between border-b border-white/10 pb-5 text-sm">
          <span className="text-slate-400">
            Items ({cart.summary.itemCount})
          </span>
          <span>{money.format(cart.summary.subtotal)}</span>
        </div>
        <div className="flex justify-between py-5">
          <span className="font-semibold">Subtotal</span>
          <span className="text-xl font-semibold">
            {money.format(cart.summary.subtotal)}
          </span>
        </div>
        <p className="text-xs leading-5 text-slate-400">
          Shipping, discounts, and final inventory confirmation are calculated
          during checkout.
        </p>
        <Link
          className="mt-6 block w-full rounded-xl bg-emerald-300 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-white"
          href="/checkout"
        >
          Proceed to checkout
        </Link>
        <Link
          className="mt-4 block text-center text-sm font-semibold text-emerald-300"
          href="/products"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
