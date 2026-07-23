"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/catalog/product-card";
import { wishlistApi } from "@/lib/wishlist-api";
import type { Wishlist } from "@/types/wishlist";

export function WishlistView() {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  useEffect(() => {
    wishlistApi
      .get()
      .then(setWishlist)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load wishlist.",
        ),
      );
  }, []);

  async function remove(productId: string) {
    setRemoving(productId);
    setError(null);
    try {
      await wishlistApi.remove(productId);
      setWishlist(await wishlistApi.get());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to remove product.",
      );
    } finally {
      setRemoving(null);
    }
  }

  if (error && !wishlist)
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="font-semibold">Sign in to open your wishlist.</p>
        <p className="mt-2 text-sm text-amber-800">{error}</p>
        <Link
          className="mt-5 inline-block font-semibold text-emerald-700"
          href="/login?next=/wishlist"
        >
          Sign in →
        </Link>
      </div>
    );
  if (!wishlist)
    return <div className="h-80 animate-pulse rounded-2xl bg-white" />;
  if (!wishlist.items.length)
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-14 text-center">
        <p className="text-2xl font-semibold">
          Save the products worth remembering.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Your wishlist stays connected to your account.
        </p>
        <Link
          className="mt-6 inline-block rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
          href="/products"
        >
          Explore products
        </Link>
      </div>
    );

  return (
    <div>
      {error && (
        <p className="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}
      <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {wishlist.items.map((item) => (
          <div className="relative" key={item.id}>
            <ProductCard product={item.product} />
            <button
              className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-rose-400 hover:text-rose-700 disabled:opacity-50"
              disabled={removing === item.product.id}
              onClick={() => remove(item.product.id)}
              type="button"
            >
              {removing === item.product.id ? "Removing…" : "Remove"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
