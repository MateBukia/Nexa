import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiNotice } from "@/components/catalog/api-notice";
import { ProductMedia } from "@/components/catalog/product-media";
import { VariantPicker } from "@/components/catalog/variant-picker";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { SaveProductButton } from "@/components/wishlist/save-product-button";
import { ReviewSection } from "@/components/reviews/review-section";
import { getProduct } from "@/lib/catalog-api";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getProduct(slug);

  if (result.available && !result.data) notFound();

  if (!result.data) {
    return (
      <StorefrontShell>
        <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-16 sm:px-8">
          <ApiNotice />
          <Link className="text-sm font-semibold" href="/products">
            ← Back to products
          </Link>
        </main>
      </StorefrontShell>
    );
  }

  const product = result.data;
  const attributes = product.attributes
    ? Object.entries(product.attributes)
    : [];

  return (
    <StorefrontShell>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <nav
          className="mb-8 flex flex-wrap items-center gap-2 text-sm text-slate-500"
          aria-label="Breadcrumb"
        >
          <Link className="hover:text-slate-950" href="/products">
            Products
          </Link>
          <span>/</span>
          <Link
            className="hover:text-slate-950"
            href={`/categories/${product.category.slug}`}
          >
            {product.category.name}
          </Link>
          <span>/</span>
          <span className="text-slate-800">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="grid gap-4 sm:grid-cols-2">
            {(product.images.length
              ? product.images
              : [
                  {
                    id: "fallback",
                    url: "",
                    altText: product.name,
                    sortOrder: 0,
                  },
                ]
            ).map((image, index) => (
              <div
                className={`group relative overflow-hidden rounded-[2rem] bg-slate-100 ${index === 0 ? "aspect-[4/5] sm:col-span-2" : "aspect-square"}`}
                key={image.id}
              >
                <ProductMedia
                  alt={image.altText ?? product.name}
                  priority={index === 0}
                  sizes={
                    index === 0
                      ? "(max-width: 1024px) 100vw, 58vw"
                      : "(max-width: 640px) 100vw, 30vw"
                  }
                  src={image.url}
                />
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              {product.brand ?? product.category.name}
            </p>
            <h1 className="mt-3 text-5xl font-semibold leading-[1.02] tracking-[-0.055em]">
              {product.name}
            </h1>
            {product.rating && (
              <p className="mt-4 text-sm text-slate-500">
                {product.rating.count
                  ? `★ ${product.rating.average?.toFixed(1)} · ${product.rating.count} reviews`
                  : "New arrival"}
              </p>
            )}
            <p className="mt-6 text-base leading-7 text-slate-600">
              {product.description}
            </p>

            <div className="mt-9 border-t border-slate-200 pt-8">
              <VariantPicker variants={product.variants} />
              <SaveProductButton productId={product.id} />
            </div>

            {attributes.length > 0 && (
              <div className="mt-9 border-t border-slate-200 pt-8">
                <h2 className="text-sm font-semibold">Product details</h2>
                <dl className="mt-4 divide-y divide-slate-200 text-sm">
                  {attributes.map(([key, value]) => (
                    <div className="flex justify-between gap-6 py-3" key={key}>
                      <dt className="capitalize text-slate-500">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd className="text-right font-medium text-slate-900">
                        {String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </aside>
        </div>
        <ReviewSection productId={product.id} />
      </main>
    </StorefrontShell>
  );
}
