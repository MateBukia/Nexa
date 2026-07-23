export interface ShoppingFilters {
  terms: string[];
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  attributes: string[];
}

export interface GroundedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  brand: string | null;
  tags: string[];
  attributes: unknown;
  price: number;
  availableQuantity: number;
}

export interface ShoppingAnswer {
  answer: string;
  recommendedProductIds: string[];
  clarificationNeeded: boolean;
}

export interface SupportAnswer {
  answer: string;
  escalationNeeded: boolean;
  escalationReason: string | null;
  ticketSubject: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  relatedOrderId: string | null;
}

export interface ProductCopy {
  nameSuggestion: string;
  shortDescription: string;
  description: string;
  tags: string[];
}

export interface ReviewSummary {
  summary: string;
  strengths: string[];
  concerns: string[];
  sentiment: 'POSITIVE' | 'MIXED' | 'NEGATIVE' | 'INSUFFICIENT_DATA';
}

export interface SupportIssueSummary {
  summary: string;
  recurringIssues: {
    issue: string;
    frequency: number;
    recommendation: string;
  }[];
}

export interface SupportReplyDraft {
  reply: string;
  requiresHumanVerification: boolean;
  verificationNotes: string[];
}
