export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TicketPerson {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
}

export interface TicketMessage {
  id: string;
  senderType: "CUSTOMER" | "SUPPORT_AGENT" | "AI_ASSISTANT" | "SYSTEM";
  body: string;
  isInternal: boolean;
  createdAt: string;
  author?: TicketPerson | null;
  attachments: { id: string; fileName: string; fileUrl: string }[];
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customer: TicketPerson;
  assignee?: TicketPerson | null;
  order?: { id: string; orderNumber: string; status: string } | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface TicketListResponse {
  items: SupportTicket[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
