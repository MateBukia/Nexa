import type { Product } from "./catalog";

export interface Wishlist {
  id: string;
  items: { id: string; createdAt: string; product: Product }[];
}
