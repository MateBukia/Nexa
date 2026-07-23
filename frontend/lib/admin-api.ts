import { apiRequest } from "@/lib/api";
import type { Category, Product, ProductListResponse } from "@/types/catalog";
import type { DashboardAnalytics } from "@/types/analytics";

export const adminApi = {
  analytics: () => apiRequest<DashboardAnalytics>("/analytics/dashboard"),
  categories: () => apiRequest<Category[]>("/categories/admin/all"),
  createCategory: (body: Record<string, unknown>) =>
    apiRequest<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiRequest<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCategory: (id: string) =>
    apiRequest<void>(`/categories/${id}`, { method: "DELETE" }),
  products: (params = "limit=100") =>
    apiRequest<ProductListResponse>(`/products/admin/all?${params}`),
  product: (id: string) => apiRequest<Product>(`/products/admin/${id}`),
  createProduct: (body: Record<string, unknown>) =>
    apiRequest<Product>("/products", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateProduct: (id: string, body: Record<string, unknown>) =>
    apiRequest<Product>(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  archiveProduct: (id: string) =>
    apiRequest<void>(`/products/${id}`, { method: "DELETE" }),
  createVariant: (productId: string, body: Record<string, unknown>) =>
    apiRequest(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateVariant: (
    productId: string,
    variantId: string,
    body: Record<string, unknown>,
  ) =>
    apiRequest(`/products/${productId}/variants/${variantId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
