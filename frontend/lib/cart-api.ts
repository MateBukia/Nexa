import { apiRequest } from "@/lib/api";
import type { Cart } from "@/types/cart";

export const cartApi = {
  get: () => apiRequest<Cart>("/cart"),
  add: (variantId: string, quantity: number) =>
    apiRequest<Cart>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ variantId, quantity }),
    }),
  update: (itemId: string, quantity: number) =>
    apiRequest<Cart>(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  remove: (itemId: string) =>
    apiRequest<void>(`/cart/items/${itemId}`, { method: "DELETE" }),
};
