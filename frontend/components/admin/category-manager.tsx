"use client";

import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { Category } from "@/types/catalog";
import { AdminError } from "./admin-overview";

const inputClass =
  "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500";

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    adminApi
      .categories()
      .then(setCategories)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load categories.",
        ),
      );
  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await adminApi.createCategory({
        name: String(data.get("name")).trim(),
        slug: String(data.get("slug")).trim(),
        description: String(data.get("description")).trim() || undefined,
      });
      form.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create category.",
      );
    }
  }

  async function toggle(category: Category) {
    try {
      await adminApi.updateCategory(category.id, {
        isActive: !category.isActive,
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update category.",
      );
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Delete ${category.name}? Empty categories only.`))
      return;
    try {
      await adminApi.deleteCategory(category.id);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete category.",
      );
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
      <form
        className="self-start rounded-2xl border border-slate-200 bg-white p-6"
        onSubmit={create}
      >
        <h2 className="text-lg font-semibold">Add category</h2>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-medium">
            Name
            <input
              className={`${inputClass} mt-2 w-full`}
              name="name"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Slug
            <input
              className={`${inputClass} mt-2 w-full`}
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Description
            <textarea
              className={`${inputClass} mt-2 min-h-24 w-full py-3`}
              name="description"
            />
          </label>
          <button
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            type="submit"
          >
            Create category
          </button>
        </div>
      </form>
      <div>
        {error && (
          <div className="mb-4">
            <AdminError message={error} />
          </div>
        )}
        {!categories ? (
          <div className="h-72 animate-pulse rounded-2xl bg-white" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {categories.map((category) => {
              const item = category;
              return (
                <div
                  className="flex items-center justify-between gap-5 border-b border-slate-100 p-5 last:border-0"
                  key={category.id}
                >
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      /{category.slug} · {category._count?.products ?? 0}{" "}
                      products
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${item.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      onClick={() => toggle(item)}
                      type="button"
                    >
                      {item.isActive !== false ? "Active" : "Inactive"}
                    </button>
                    <button
                      className="text-sm text-slate-400 hover:text-rose-700"
                      onClick={() => remove(category)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {!categories.length && (
              <p className="p-10 text-center text-sm text-slate-500">
                No categories yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
