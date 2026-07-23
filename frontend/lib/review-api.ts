import { apiRequest } from "@/lib/api";
import type { Review, ReviewListResponse } from "@/types/review";

export const reviewApi = {
  list: (productId: string) =>
    apiRequest<ReviewListResponse>(`/products/${productId}/reviews`),
  create: (productId: string, body: { rating: number; title?: string; body: string }) =>
    apiRequest<Review>(`/products/${productId}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
