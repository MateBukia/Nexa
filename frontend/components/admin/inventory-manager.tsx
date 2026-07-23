"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { Product, ProductVariant } from "@/types/catalog";
import { AdminError } from "./admin-overview";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500";

export function InventoryManager() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = () =>
    adminApi
      .products()
      .then((result) => setProducts(result.items))
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load inventory.",
        ),
      );
  useEffect(() => {
    void load();
  }, []);

  async function update(
    event: FormEvent<HTMLFormElement>,
    product: Product,
    variant: ProductVariant,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await adminApi.updateVariant(product.id, variant.id, {
        price: Number(data.get("price")),
        inventory: {
          quantity: Number(data.get("quantity")),
          lowStockThreshold: Number(data.get("lowStockThreshold")),
        },
      });
      setSaved(variant.id);
      setTimeout(() => setSaved(null), 1800);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update inventory.",
      );
    }
  }

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await adminApi.createVariant(String(data.get("productId")), {
        sku: String(data.get("sku")).trim(),
        name: String(data.get("name")).trim(),
        price: Number(data.get("price")),
        inventory: {
          quantity: Number(data.get("quantity")),
          lowStockThreshold: Number(data.get("lowStockThreshold")),
        },
      });
      form.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to add variant.",
      );
    }
  }

  if (!products)
    return <div className="h-80 animate-pulse rounded-2xl bg-white" />;

  return (
    <div className="space-y-6">
      {error && <AdminError message={error} />}
      <form
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.3fr_repeat(4,1fr)_auto] md:items-end"
        onSubmit={createVariant}
      >
        <label className="text-xs font-semibold text-slate-600">
          Product
          <select className={`${inputClass} mt-2`} name="productId" required>
            <option value="">Select product</option>
            {products
              .filter((product) => product.status !== "ARCHIVED")
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          SKU
          <input className={`${inputClass} mt-2`} name="sku" required />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Option name
          <input className={`${inputClass} mt-2`} name="name" required />
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Price
          <input
            className={`${inputClass} mt-2`}
            min="0"
            name="price"
            step="0.01"
            type="number"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Quantity
            <input
              className={`${inputClass} mt-2`}
              defaultValue="0"
              min="0"
              name="quantity"
              type="number"
              required
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Low at
            <input
              className={`${inputClass} mt-2`}
              defaultValue="5"
              min="0"
              name="lowStockThreshold"
              type="number"
              required
            />
          </label>
        </div>
        <button
          className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          type="submit"
        >
          Add variant
        </button>
      </form>

      <div className="space-y-4">
        {products.flatMap((product) =>
          product.variants.map((variant) => {
            const available =
              (variant.inventory?.quantity ?? 0) -
              (variant.inventory?.reservedQuantity ?? 0);
            const low =
              available <= (variant.inventory?.lowStockThreshold ?? 0);
            return (
              <form
                className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1.5fr_1fr_repeat(3,0.65fr)_auto] md:items-end"
                key={variant.id}
                onSubmit={(event) => update(event, product, variant)}
              >
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {variant.name} · {variant.sku}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Available
                  </p>
                  <p
                    className={`mt-2 text-lg font-semibold ${low ? "text-amber-700" : "text-emerald-700"}`}
                  >
                    {available}
                  </p>
                </div>
                <label className="text-xs font-semibold text-slate-500">
                  Price
                  <input
                    className={`${inputClass} mt-2`}
                    defaultValue={variant.price}
                    min="0"
                    name="price"
                    step="0.01"
                    type="number"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  Quantity
                  <input
                    className={`${inputClass} mt-2`}
                    defaultValue={variant.inventory?.quantity ?? 0}
                    min={variant.inventory?.reservedQuantity ?? 0}
                    name="quantity"
                    type="number"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  Low at
                  <input
                    className={`${inputClass} mt-2`}
                    defaultValue={variant.inventory?.lowStockThreshold ?? 5}
                    min="0"
                    name="lowStockThreshold"
                    type="number"
                  />
                </label>
                <button
                  className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold hover:border-slate-950"
                  type="submit"
                >
                  {saved === variant.id ? "Saved" : "Save"}
                </button>
              </form>
            );
          }),
        )}
      </div>
    </div>
  );
}
