import { ApiNotice } from "@/components/catalog/api-notice";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { Pagination } from "@/components/catalog/pagination";
import { ProductGrid } from "@/components/catalog/product-grid";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { getCategories, getProducts } from "@/lib/catalog-api";
import { PageSearchParams, singleValueParams } from "@/lib/search-params";
import { getTranslations } from "@/lib/i18n/server";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = singleValueParams(await searchParams);
  const [products, categories, { t }] = await Promise.all([
    getProducts(params),
    getCategories(),
    getTranslations(),
  ]);

  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            {t("products.eyebrow")}
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
            {t("products.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            {t("products.description")}
          </p>
        </div>

        <div className="mt-10">
          <CatalogFilters categories={categories.data} values={params} />
        </div>

        <div className="mb-7 mt-12 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-950">
              {products.data.pagination.total}
            </span>{" "}
            {t("products.count")}
          </p>
        </div>

        {!products.available && <ApiNotice />}
        <ProductGrid products={products.data.items} />
        <Pagination
          page={products.data.pagination.page}
          pages={products.data.pagination.pages}
          params={params}
          pathname="/products"
        />
      </main>
    </StorefrontShell>
  );
}
