import type { Product } from "@/types/catalog";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-slate-300 px-6 py-20 text-center">
        <p className="text-xl font-semibold text-slate-900">
          No products found
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Try a broader search, remove a price limit, or browse another
          category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} priority={index < 4} product={product} />
      ))}
    </div>
  );
}
