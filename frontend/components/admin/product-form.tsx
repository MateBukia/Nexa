"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { Category, Product } from "@/types/catalog";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.categories(),
      productId ? adminApi.product(productId) : Promise.resolve(null),
    ])
      .then(([categoryList, currentProduct]) => {
        setCategories(categoryList);
        setProduct(currentProduct);
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load form.",
        ),
      )
      .finally(() => setLoading(false));
  }, [productId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);

    try {
      let attributes: Record<string, unknown> | undefined;
      const rawAttributes = String(data.get("attributes") ?? "").trim();
      if (rawAttributes)
        attributes = JSON.parse(rawAttributes) as Record<string, unknown>;

      const imageUrl = String(data.get("imageUrl") ?? "").trim();
      const base: Record<string, unknown> = {
        categoryId: String(data.get("categoryId")),
        name: String(data.get("name")).trim(),
        slug: String(data.get("slug")).trim(),
        description: String(data.get("description")).trim(),
        shortDescription:
          String(data.get("shortDescription")).trim() || undefined,
        brand: String(data.get("brand")).trim() || undefined,
        status: String(data.get("status")),
        tags: String(data.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        attributes,
        isFeatured: data.get("isFeatured") === "on",
        images: imageUrl
          ? [{ url: imageUrl, altText: String(data.get("name")).trim() }]
          : [],
      };

      if (productId) {
        await adminApi.updateProduct(productId, base);
      } else {
        base.variants = [
          {
            sku: String(data.get("sku")).trim(),
            name: String(data.get("variantName")).trim(),
            price: Number(data.get("price")),
            compareAtPrice: data.get("compareAtPrice")
              ? Number(data.get("compareAtPrice"))
              : undefined,
            inventory: {
              quantity: Number(data.get("quantity")),
              lowStockThreshold: Number(data.get("lowStockThreshold")),
            },
          },
        ];
        await adminApi.createProduct(base);
      }

      router.push("/admin/products");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save product. Check attribute JSON.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  return (
    <form className="space-y-6" onSubmit={submit}>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      )}
      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-lg font-semibold">
          Product information
        </h2>
        <label className="text-sm font-medium">
          Name
          <input
            className={inputClass}
            defaultValue={product?.name}
            name="name"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Slug
          <input
            className={inputClass}
            defaultValue={product?.slug}
            name="slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="product-name"
            required
          />
        </label>
        <label className="text-sm font-medium">
          Category
          <select
            className={inputClass}
            defaultValue={product?.category.id}
            name="categoryId"
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Status
          <select
            className={inputClass}
            defaultValue={product?.status ?? "DRAFT"}
            name="status"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Brand
          <input
            className={inputClass}
            defaultValue={product?.brand ?? ""}
            name="brand"
          />
        </label>
        <label className="text-sm font-medium">
          Tags
          <input
            className={inputClass}
            defaultValue={product?.tags.join(", ")}
            name="tags"
            placeholder="laptop, coding, portable"
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Short description
          <input
            className={inputClass}
            defaultValue={product?.shortDescription ?? ""}
            name="shortDescription"
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Description
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            defaultValue={product?.description}
            name="description"
            required
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Primary image URL
          <input
            className={inputClass}
            defaultValue={product?.images[0]?.url ?? ""}
            name="imageUrl"
            type="url"
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Attributes JSON
          <textarea
            className={`${inputClass} min-h-24 font-mono`}
            defaultValue={
              product?.attributes
                ? JSON.stringify(product.attributes, null, 2)
                : ""
            }
            name="attributes"
            placeholder={'{"color":"Black"}'}
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
          <input
            defaultChecked={product?.isFeatured}
            name="isFeatured"
            type="checkbox"
          />{" "}
          Feature this product
        </label>
      </section>

      {!productId && (
        <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold">Initial variant</h2>
            <p className="mt-1 text-sm text-slate-500">
              Additional variants can be managed after the product is created.
            </p>
          </div>
          <label className="text-sm font-medium">
            SKU
            <input className={inputClass} name="sku" required />
          </label>
          <label className="text-sm font-medium">
            Variant name
            <input
              className={inputClass}
              name="variantName"
              placeholder="Default"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Price (GEL)
            <input
              className={inputClass}
              min="0"
              name="price"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Compare-at price
            <input
              className={inputClass}
              min="0"
              name="compareAtPrice"
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Quantity
            <input
              className={inputClass}
              defaultValue="0"
              min="0"
              name="quantity"
              required
              type="number"
            />
          </label>
          <label className="text-sm font-medium">
            Low-stock threshold
            <input
              className={inputClass}
              defaultValue="5"
              min="0"
              name="lowStockThreshold"
              required
              type="number"
            />
          </label>
        </section>
      )}

      {productId && (
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Variant pricing and stock are managed from the inventory page.
        </p>
      )}
      <div className="flex justify-end">
        <button
          className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting
            ? "Saving…"
            : productId
              ? "Save changes"
              : "Create product"}
        </button>
      </div>
    </form>
  );
}
