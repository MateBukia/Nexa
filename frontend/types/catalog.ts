export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  _count?: { products: number; children?: number };
}

export interface Inventory {
  quantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: string;
  compareAtPrice?: string | null;
  attributes?: Record<string, unknown> | null;
  inventory?: Inventory | null;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  brand?: string | null;
  tags: string[];
  attributes?: Record<string, unknown> | null;
  isFeatured: boolean;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  createdAt?: string;
  category: Pick<Category, "id" | "name" | "slug">;
  images: ProductImage[];
  variants: ProductVariant[];
  rating?: { average: number | null; count: number };
}

export interface ProductListResponse {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CatalogResult<T> {
  data: T;
  available: boolean;
}
