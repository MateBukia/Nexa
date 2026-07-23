"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { Product } from "@/types/catalog";
import { AdminError } from "./admin-overview";

const money = new Intl.NumberFormat("en-GE", {
  style: "currency",
  currency: "GEL",
});

export function ProductsTable() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .products()
      .then((result) => setProducts(result.items))
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : "Unable to load products.",
        );
      });
  }, []);

  async function archive(product: Product) {
    if (!window.confirm(`Archive ${product.name}?`)) return;
    try {
      await adminApi.archiveProduct(product.id);
      setProducts(
        (current) =>
          current?.map((item) =>
            item.id === product.id ? { ...item, status: "ARCHIVED" } : item,
          ) ?? [],
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to archive product.",
      );
    }
  }

  if (error) return <AdminError message={error} />;
  if (!products)
    return <div className="h-72 animate-pulse rounded-2xl bg-white" />;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Price from</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const stock = product.variants.reduce(
                (sum, variant) =>
                  sum +
                  Math.max(
                    0,
                    (variant.inventory?.quantity ?? 0) -
                      (variant.inventory?.reservedQuantity ?? 0),
                  ),
                0,
              );
              return (
                <tr className="hover:bg-slate-50" key={product.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {product.variants.length} variants
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {product.category.name}
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {money.format(Number(product.variants[0]?.price ?? 0))}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        stock <= 5 ? "text-amber-700" : "text-slate-600"
                      }
                    >
                      {stock}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : product.status === "ARCHIVED" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700"}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="font-semibold text-emerald-700 hover:text-emerald-900"
                      href={`/admin/products/${product.id}/edit`}
                    >
                      Edit
                    </Link>
                    {product.status !== "ARCHIVED" && (
                      <button
                        className="ml-4 text-slate-400 hover:text-rose-700"
                        onClick={() => archive(product)}
                        type="button"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!products.length && (
        <p className="p-10 text-center text-sm text-slate-500">
          No products yet.
        </p>
      )}
    </div>
  );
}
