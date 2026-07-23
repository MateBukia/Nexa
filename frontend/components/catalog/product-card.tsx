"use client";

import Link from "next/link";
import type { Product } from "@/types/catalog";
import { ProductMedia } from "./product-media";
import { useTranslations } from "@/components/i18n/i18n-provider";
import { formatGel } from "@/lib/format";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { locale, t } = useTranslations();
  const price = Number(product.variants[0]?.price ?? 0);
  const available = product.variants.some(
    (variant) =>
      (variant.inventory?.quantity ?? 0) -
        (variant.inventory?.reservedQuantity ?? 0) >
      0,
  );

  return (
    <article className="group min-w-0">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-4/5 overflow-hidden rounded-[1.75rem] bg-slate-100">
          <ProductMedia
            alt={product.images[0]?.altText ?? product.name}
            priority={priority}
            src={product.images[0]?.url}
          />
          {product.isFeatured && (
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-800 backdrop-blur">
              {t("products.featured")}
            </span>
          )}
        </div>
        <div className="px-1 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                {product.category.name}
              </p>
              <h3 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950">
                {product.name}
              </h3>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-900">
              {formatGel(price, locale)}
            </p>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {product.shortDescription ?? product.description}
          </p>
          <p
            className={`mt-3 text-xs font-medium ${available ? "text-emerald-700" : "text-amber-700"}`}
          >
            {available ? t("products.inStock") : t("products.unavailable")}
          </p>
        </div>
      </Link>
    </article>
  );
}
