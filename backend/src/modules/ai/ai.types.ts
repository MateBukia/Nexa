export type ShoppingIntent =
  | 'PRODUCT_SEARCH'
  | 'RECOMMENDATION'
  | 'COMPARISON'
  | 'PRODUCT_DETAILS'
  | 'AVAILABILITY'
  | 'STORE_INFORMATION';

export interface ShoppingFilters {
  intent: ShoppingIntent;
  keywords: string[];
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  color: string | null;
  size: string | null;
  brand: string | null;
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
  recommendations: { productId: string; reason: string }[];
  clarificationNeeded: boolean;
}

export interface ShoppingRecommendation {
  productId: string;
  slug: string;
  name: string;
  price: string;
  imageUrl?: string;
  url: string;
  reason: string;
}

export interface SupportAnswer {
  answer: string;
  escalationNeeded: boolean;
  escalationReason: string | null;
  ticketSubject: string | null;
  conversationSummary: string | null;
  suggestedCategory:
    'SHIPPING' | 'RETURNS' | 'PAYMENT' | 'ACCOUNT' | 'ORDER' | 'OTHER';
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
