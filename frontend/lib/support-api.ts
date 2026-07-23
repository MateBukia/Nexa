import { apiRequest } from "@/lib/api";
import type { SupportTicket, TicketListResponse, TicketStatus } from "@/types/support";

export const supportApi = {
  mine: () => apiRequest<TicketListResponse>("/tickets/me"),
  inbox: (status?: string) => apiRequest<TicketListResponse>(`/tickets${status ? `?status=${status}` : ""}`),
  one: (id: string) => apiRequest<SupportTicket>(`/tickets/${id}`),
  create: (body: Record<string, unknown>) => apiRequest<SupportTicket>("/tickets", { method: "POST", body: JSON.stringify(body) }),
  message: (id: string, body: string, isInternal = false) => apiRequest<SupportTicket>(`/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body, isInternal }) }),
  assignSelf: (id: string) => apiRequest<SupportTicket>(`/tickets/${id}/assign-self`, { method: "PATCH" }),
  status: (id: string, status: TicketStatus) => apiRequest<SupportTicket>(`/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
