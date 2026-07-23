import { apiRequest } from "@/lib/api";
import type {
  ProductCopyResponse,
  ReviewSummaryResponse,
  ShoppingAssistantResponse,
  SupportAssistantResponse,
  SupportIssueSummaryResponse,
  SupportReplyDraftResponse,
} from "@/types/ai";

export const aiApi = {
  shop: (message: string, sessionId?: string) =>
    apiRequest<ShoppingAssistantResponse>("/ai/shop-assistant", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),
  support: (message: string, sessionId?: string) =>
    apiRequest<SupportAssistantResponse>("/ai/support-assistant", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),
  productCopy: (notes: string, tone?: string) =>
    apiRequest<ProductCopyResponse>("/ai/generate-product-copy", {
      method: "POST",
      body: JSON.stringify({ notes, tone }),
    }),
  reviewSummary: (productId: string) =>
    apiRequest<ReviewSummaryResponse>("/ai/summarize-reviews", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),
  supportIssues: () =>
    apiRequest<SupportIssueSummaryResponse>("/ai/summarize-support-issues", {
      method: "POST",
      body: "{}",
    }),
  supportReply: (ticketId: string, guidance?: string) =>
    apiRequest<SupportReplyDraftResponse>("/ai/draft-support-reply", {
      method: "POST",
      body: JSON.stringify({ ticketId, guidance }),
    }),
};
