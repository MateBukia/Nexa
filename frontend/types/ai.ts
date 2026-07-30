export type ShoppingIntent =
  | "PRODUCT_SEARCH"
  | "RECOMMENDATION"
  | "COMPARISON"
  | "PRODUCT_DETAILS"
  | "AVAILABILITY"
  | "STORE_INFORMATION";

export interface ShoppingRecommendation {
  productId: string;
  slug: string;
  name: string;
  price: string;
  imageUrl?: string;
  url: string;
  reason: string;
}

export interface ShoppingAssistantResponse {
  sessionId: string | null;
  message: string;
  requiresClarification: boolean;
  filters: {
    intent: ShoppingIntent;
    keywords: string[];
    category: string | null;
    minPrice: number | null;
    maxPrice: number | null;
    color: string | null;
    size: string | null;
    brand: string | null;
  };
  recommendations: ShoppingRecommendation[];
}

export interface SupportAssistantResponse {
  sessionId: string | null;
  message: string;
  escalationNeeded: boolean;
  relatedOrderId: string | null;
  requiresTicketConfirmation: boolean;
  ticketProposal: {
    title: string;
    conversationSummary: string;
    suggestedCategory: string;
    priority: string;
    relatedOrderId: string | null;
  } | null;
  ticket: {
    id: string;
    ticketNumber: string;
    subject: string;
    status: string;
  } | null;
}

export interface ConfirmedSupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
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
