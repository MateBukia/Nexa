import type { Product } from "./catalog";

export interface ShoppingAssistantResponse {
  sessionId: string;
  message: string;
  clarificationNeeded: boolean;
  filters: {
    terms: string[];
    category: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    attributes: string[];
  };
  recommendations: Product[];
}

export interface SupportAssistantResponse {
  sessionId: string;
  message: string;
  escalationNeeded: boolean;
  relatedOrderId: string | null;
  ticket: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
  } | null;
}

export interface ProductCopyResponse {
  nameSuggestion: string;
  shortDescription: string;
  description: string;
  tags: string[];
}
export interface ReviewSummaryResponse {
  product: { id: string; name: string };
  reviewCount: number;
  summary: string;
  strengths: string[];
  concerns: string[];
  sentiment: string;
}
export interface SupportIssueSummaryResponse {
  ticketCount: number;
  summary: string;
  recurringIssues: {
    issue: string;
    frequency: number;
    recommendation: string;
  }[];
}
export interface SupportReplyDraftResponse {
  reply: string;
  requiresHumanVerification: boolean;
  verificationNotes: string[];
}
