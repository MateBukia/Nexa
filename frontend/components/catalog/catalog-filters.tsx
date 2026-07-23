"use client";

import type { Category } from "@/types/catalog";
import { useTranslations } from "@/components/i18n/i18n-provider";

interface CatalogFiltersProps {
  categories: Category[];
  values: Record<string, string | undefined>;
  lockCategory?: boolean;
}

const fieldClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function CatalogFilters({
  categories,
  values,
  lockCategory,
}: CatalogFiltersProps) {
  const { t } = useTranslations();
  return (
    <form
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-[minmax(12rem,1fr)_repeat(3,auto)_auto]"
      method="get"
    >
      <input
        aria-label={t("filters.searchLabel")}
        className={fieldClass}
        defaultValue={values.search}
        name="search"
        placeholder={t("filters.search")}
        type="search"
      />

      {lockCategory ? (
        <input name="category" type="hidden" value={values.category} />
      ) : (
        <select
          aria-label={t("filters.category")}
          className={fieldClass}
          defaultValue={values.category ?? ""}
          name="category"
        >
          <option value="">{t("filters.allCategories")}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          aria-label={t("filters.minLabel")}
          className={`${fieldClass} w-28`}
          defaultValue={values.minPrice}
          min="0"
          name="minPrice"
          placeholder={t("filters.min")}
          step="0.01"
          type="number"
        />
        <input
          aria-label={t("filters.maxLabel")}
          className={`${fieldClass} w-28`}
          defaultValue={values.maxPrice}
          min="0"
          name="maxPrice"
          placeholder={t("filters.max")}
          step="0.01"
          type="number"
        />
      </div>

      <select
        aria-label={t("filters.sort")}
        className={fieldClass}
        defaultValue={values.sort ?? "newest"}
        name="sort"
      >
        <option value="newest">{t("filters.newest")}</option>
        <option value="name_asc">{t("filters.nameAsc")}</option>
        <option value="name_desc">{t("filters.nameDesc")}</option>
        <option value="price_asc">{t("filters.priceAsc")}</option>
        <option value="price_desc">{t("filters.priceDesc")}</option>
      </select>

      <button
        className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        type="submit"
      >
        {t("filters.apply")}
      </button>
    </form>
  );
}
