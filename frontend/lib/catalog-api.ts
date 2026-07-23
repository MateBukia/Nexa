import type {
  CatalogResult,
  Category,
  Product,
  ProductListResponse,
} from "@/types/catalog";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function catalogRequest<T>(path: string): Promise<CatalogResult<T>> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { data: null as T, available: true };
    }

    return { data: (await response.json()) as T, available: true };
  } catch {
    return { data: null as T, available: false };
  }
}

export async function getCategories(): Promise<CatalogResult<Category[]>> {
  const result = await catalogRequest<Category[]>("/categories");
  return { data: result.data ?? [], available: result.available };
}

export async function getCategory(slug: string): Promise<CatalogResult<Category | null>> {
  const result = await catalogRequest<Category>(`/categories/${encodeURIComponent(slug)}`);
  return { data: result.data ?? null, available: result.available };
}

export async function getProducts(
  params: Record<string, string | undefined> = {},
): Promise<CatalogResult<ProductListResponse>> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const suffix = search.size ? `?${search.toString()}` : "";
  const result = await catalogRequest<ProductListResponse>(`/products${suffix}`);
  return {
    data: result.data ?? {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    },
    available: result.available,
  };
}

export async function getProduct(slug: string): Promise<CatalogResult<Product | null>> {
  const result = await catalogRequest<Product>(`/products/${encodeURIComponent(slug)}`);
  return { data: result.data ?? null, available: result.available };
}
