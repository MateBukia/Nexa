import { notFound } from "next/navigation";
import { ApiNotice } from "@/components/catalog/api-notice";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { Pagination } from "@/components/catalog/pagination";
import { ProductGrid } from "@/components/catalog/product-grid";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { getCategories, getCategory, getProducts } from "@/lib/catalog-api";
import { PageSearchParams, singleValueParams } from "@/lib/search-params";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: PageSearchParams;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const values = { ...singleValueParams(await searchParams), category: slug };
  const [category, products, categories] = await Promise.all([
    getCategory(slug),
    getProducts(values),
    getCategories(),
  ]);

  if (category.available && !category.data) notFound();

  return (
    <StorefrontShell>
      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-4xl bg-emerald-100 px-7 py-12 sm:px-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
            Category
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tighter">
            {category.data?.name ?? "Catalog unavailable"}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            {category.data?.description ??
              "Start the backend to load this category."}
          </p>
        </div>

        <div className="mt-8">
          <CatalogFilters
            categories={categories.data}
            lockCategory
            values={values}
          />
        </div>

        <div className="mb-7 mt-12 text-sm text-slate-500">
          <span className="font-semibold text-slate-950">
            {products.data.pagination.total}
          </span>{" "}
          products
        </div>
        {!products.available && <ApiNotice />}
        <ProductGrid products={products.data.items} />
        <Pagination
          page={products.data.pagination.page}
          pages={products.data.pagination.pages}
          params={values}
          pathname={`/categories/${slug}`}
        />
      </main>
    </StorefrontShell>
  );
}
