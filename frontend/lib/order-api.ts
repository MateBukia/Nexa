import { apiRequest } from "@/lib/api";
import type { Order, OrderListResponse, OrderStatus } from "@/types/order";

export const orderApi = {
  create: (body: Record<string, unknown>) =>
    apiRequest<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
  mine: () => apiRequest<OrderListResponse>("/orders/me"),
  one: (id: string) => apiRequest<Order>(`/orders/${id}`),
  all: (status?: string) =>
    apiRequest<OrderListResponse>(`/orders${status ? `?status=${status}` : ""}`),
  updateStatus: (id: string, status: OrderStatus) =>
    apiRequest<Order>(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
