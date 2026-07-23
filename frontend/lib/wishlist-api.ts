import { apiRequest } from "@/lib/api";
import type { Wishlist } from "@/types/wishlist";

export const wishlistApi = {
  get: () => apiRequest<Wishlist>("/wishlist"),
  add: (productId: string) =>
    apiRequest<Wishlist>("/wishlist/items", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),
  remove: (productId: string) =>
    apiRequest<void>(`/wishlist/items/${productId}`, { method: "DELETE" }),
};
