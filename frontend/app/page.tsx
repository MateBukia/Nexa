import Link from "next/link";
import { ApiNotice } from "@/components/catalog/api-notice";
import { CategoryCard } from "@/components/catalog/category-card";
import { ProductGrid } from "@/components/catalog/product-grid";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { getCategories, getProducts } from "@/lib/catalog-api";
import { getTranslations } from "@/lib/i18n/server";

export default async function Home() {
  const [categories, products, { t }] = await Promise.all([
    getCategories(),
    getProducts({ sort: "newest", limit: "4" }),
    getTranslations(),
  ]);

  return (
    <StorefrontShell>
      <main>
        <section className="mx-auto max-w-7xl px-5 pb-18 pt-10 sm:px-8 sm:pt-16">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 px-6 py-16 text-white sm:px-12 sm:py-24 lg:px-20">
            <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />
            <div className="absolute -bottom-40 right-1/3 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
                {t("home.eyebrow")}
              </p>
              <h1 className="mt-6 text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl">
                {t("home.title")}
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                {t("home.description")}
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-emerald-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-white"
                  href="/products"
                >
                  {t("home.shop")}
                </Link>
                <Link
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
                  href="/products?sort=newest"
                >
                  {t("home.new")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-18 sm:px-8">
          {!categories.available && <ApiNotice />}
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                {t("home.browse")}
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
                {t("home.categories")}
              </h2>
            </div>
            <Link
              className="hidden text-sm font-semibold hover:text-emerald-700 sm:block"
              href="/products"
            >
              {t("home.everything")}
            </Link>
          </div>
          {categories.data.length ? (
            <div className="mt-9 grid gap-5 md:grid-cols-2">
              {categories.data.slice(0, 4).map((category, index) => (
                <CategoryCard
                  category={category}
                  index={index}
                  key={category.id}
                />
              ))}
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-slate-500">
              {t("home.noCategories")}
            </p>
          )}
        </section>

        <section className="mx-auto max-w-7xl px-5 py-18 sm:px-8">
          <div className="mb-9 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                {t("home.fresh")}
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.045em]">
                {t("home.latest")}
              </h2>
            </div>
            <Link
              className="text-sm font-semibold hover:text-emerald-700"
              href="/products"
            >
              {t("home.shopAll")}
            </Link>
          </div>
          <ProductGrid products={products.data.items} />
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
          <div className="grid gap-8 rounded-[2rem] bg-emerald-700 px-7 py-10 text-white sm:px-10 md:grid-cols-3">
            {[
              [t("home.liveTitle"), t("home.liveCopy")],
              [t("home.clearTitle"), t("home.clearCopy")],
              [t("home.smartTitle"), t("home.smartCopy")],
            ].map(([title, copy]) => (
              <div key={title}>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-100">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </StorefrontShell>
  );
}
