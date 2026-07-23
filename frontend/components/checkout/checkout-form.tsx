"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { cartApi } from "@/lib/cart-api";
import { orderApi } from "@/lib/order-api";
import type { Cart } from "@/types/cart";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function CheckoutForm() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    cartApi
      .get()
      .then(setCart)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load checkout.",
        ),
      );
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const optional = (name: string) =>
      String(data.get(name) ?? "").trim() || undefined;
    try {
      const order = await orderApi.create({
        shippingAddress: {
          firstName: String(data.get("firstName")).trim(),
          lastName: String(data.get("lastName")).trim(),
          phone: optional("phone"),
          line1: String(data.get("line1")).trim(),
          line2: optional("line2"),
          city: String(data.get("city")).trim(),
          region: optional("region"),
          postalCode: String(data.get("postalCode")).trim(),
          country: String(data.get("country")).trim().toUpperCase(),
        },
        saveAddress: data.get("saveAddress") === "on",
        notes: optional("notes"),
      });
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to place order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !cart)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold">Sign in to continue to checkout.</p>
        <p className="mt-2 text-sm text-amber-800">{error}</p>
        <Link
          className="mt-5 inline-block rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
          href="/login?next=/checkout"
        >
          Sign in
        </Link>
      </div>
    );
  if (!cart) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  if (!cart.items.length)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-xl font-semibold">Your cart is empty.</p>
        <Link
          className="mt-5 inline-block text-sm font-semibold text-emerald-700"
          href="/products"
        >
          Browse products →
        </Link>
      </div>
    );

  return (
    <form className="grid gap-8 lg:grid-cols-[1fr_22rem]" onSubmit={submit}>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Shipping address</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium">
            First name
            <input
              className={inputClass}
              autoComplete="given-name"
              name="firstName"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Last name
            <input
              className={inputClass}
              autoComplete="family-name"
              name="lastName"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Phone
            <input className={inputClass} autoComplete="tel" name="phone" />
          </label>
          <label className="text-sm font-medium">
            Country code
            <input
              className={inputClass}
              defaultValue="GE"
              maxLength={2}
              name="country"
              pattern="[A-Za-z]{2}"
              required
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Address line 1
            <input
              className={inputClass}
              autoComplete="address-line1"
              name="line1"
              required
            />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Address line 2
            <input
              className={inputClass}
              autoComplete="address-line2"
              name="line2"
            />
          </label>
          <label className="text-sm font-medium">
            City
            <input
              className={inputClass}
              autoComplete="address-level2"
              name="city"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Region
            <input
              className={inputClass}
              autoComplete="address-level1"
              name="region"
            />
          </label>
          <label className="text-sm font-medium">
            Postal code
            <input
              className={inputClass}
              autoComplete="postal-code"
              name="postalCode"
              required
            />
          </label>
          <label className="flex items-center gap-3 self-end pb-3 text-sm">
            <input name="saveAddress" type="checkbox" /> Save this address
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Delivery notes
            <textarea className={`${inputClass} min-h-24`} name="notes" />
          </label>
        </div>
      </section>

      <aside className="h-fit rounded-2xl bg-slate-950 p-6 text-white lg:sticky lg:top-28">
        <h2 className="text-lg font-semibold">Review order</h2>
        <div className="mt-5 max-h-56 space-y-3 overflow-auto border-b border-white/10 pb-5">
          {cart.items.map((item) => (
            <div className="flex justify-between gap-4 text-sm" key={item.id}>
              <span className="text-slate-300">
                {item.quantity}× {item.product.name}
                <span className="block text-xs text-slate-500">
                  {item.variant.name}
                </span>
              </span>
              <span>{money.format(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between py-5">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-semibold">
            {money.format(cart.summary.subtotal)}
          </span>
        </div>
        <p className="text-xs leading-5 text-slate-400">
          Inventory is confirmed atomically when you place the order. Payment
          collection will be added separately.
        </p>
        {error && (
          <p className="mt-4 rounded-lg bg-rose-400/10 p-3 text-xs text-rose-200">
            {error}
          </p>
        )}
        <button
          className="mt-5 w-full rounded-xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
      </aside>
    </form>
  );
}
