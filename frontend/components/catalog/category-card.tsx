import Link from "next/link";
import type { Category } from "@/types/catalog";

const tones = ["bg-emerald-100", "bg-amber-100", "bg-sky-100", "bg-violet-100"];

export function CategoryCard({
  category,
  index,
}: {
  category: Category;
  index: number;
}) {
  return (
    <Link
      className={`${tones[index % tones.length]} group flex min-h-64 flex-col justify-between rounded-[2rem] p-6 transition hover:-translate-y-1`}
      href={`/categories/${category.slug}`}
    >
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
        {category._count?.products ?? 0} products
      </span>
      <div>
        <h3 className="text-3xl font-semibold tracking-[-0.04em]">
          {category.name}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-xs text-sm leading-6 text-slate-600">
          {category.description ?? "Explore the collection."}
        </p>
        <span className="mt-5 inline-block text-sm font-semibold transition group-hover:translate-x-1">
          Browse category →
        </span>
      </div>
    </Link>
  );
}
