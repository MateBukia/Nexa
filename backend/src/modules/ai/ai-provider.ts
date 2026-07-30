import {
  GroundedProduct,
  ProductCopy,
  ReviewSummary,
  ShoppingAnswer,
  ShoppingFilters,
  SupportAnswer,
  SupportIssueSummary,
  SupportReplyDraft,
} from './ai.types';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  readonly model: string;

  extractShoppingFilters(
    message: string,
    history: { role: string; content: string }[],
    safetyIdentifier: string,
  ): Promise<ShoppingFilters>;

  composeShoppingAnswer(
    message: string,
    history: { role: string; content: string }[],
    filters: ShoppingFilters,
    products: GroundedProduct[],
    safetyIdentifier: string,
  ): Promise<ShoppingAnswer>;

  composeSupportAnswer(
    message: string,
    history: { role: string; content: string }[],
    context: object,
    safetyIdentifier: string,
  ): Promise<SupportAnswer>;

  generateProductCopy(
    notes: string,
    tone: string,
    safetyIdentifier: string,
  ): Promise<ProductCopy>;

  summarizeReviews(
    context: object,
    safetyIdentifier: string,
  ): Promise<ReviewSummary>;

  summarizeSupportIssues(
    context: object,
    safetyIdentifier: string,
  ): Promise<SupportIssueSummary>;

  draftSupportReply(
    context: object,
    safetyIdentifier: string,
  ): Promise<SupportReplyDraft>;
}
