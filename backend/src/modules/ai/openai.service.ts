import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiProvider } from './ai-provider';
import {
  GroundedProduct,
  ShoppingAnswer,
  ShoppingFilters,
  ProductCopy,
  ReviewSummary,
  SupportAnswer,
  SupportIssueSummary,
  SupportReplyDraft,
} from './ai.types';

@Injectable()
export class OpenAiService implements AiProvider {
  private readonly client: OpenAI | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY')?.trim();
    const timeout = config.get<number>('aiRequestTimeoutMs', 30000);
    this.model = config.get<string>('AI_MODEL', 'gpt-5.6-terra');
    this.client = apiKey
      ? new OpenAI({ apiKey, timeout, maxRetries: 0 })
      : null;
  }

  async extractShoppingFilters(
    message: string,
    history: { role: string; content: string }[],
    safetyIdentifier: string,
  ): Promise<ShoppingFilters> {
    const response = await this.request(() =>
      this.openai.responses.create({
        model: this.model,
        reasoning: { effort: 'low' },
        safety_identifier: safetyIdentifier,
        instructions:
          'Classify the shopping intent and extract only explicit or strongly implied catalog constraints. Use GEL for prices. Keep keywords short and useful for matching product names, descriptions, or tags. Normalize color and brand to ordinary names, preserve sizes such as EU 42 or 16 GB, and use null when a constraint is absent.',
        input: JSON.stringify({ history, message }),
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'shopping_filters',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                intent: {
                  type: 'string',
                  enum: [
                    'PRODUCT_SEARCH',
                    'RECOMMENDATION',
                    'COMPARISON',
                    'PRODUCT_DETAILS',
                    'AVAILABILITY',
                    'STORE_INFORMATION',
                  ],
                },
                keywords: { type: 'array', items: { type: 'string' } },
                category: { type: ['string', 'null'] },
                minPrice: { type: ['number', 'null'] },
                maxPrice: { type: ['number', 'null'] },
                color: { type: ['string', 'null'] },
                size: { type: ['string', 'null'] },
                brand: { type: ['string', 'null'] },
              },
              required: [
                'intent',
                'keywords',
                'category',
                'minPrice',
                'maxPrice',
                'color',
                'size',
                'brand',
              ],
            },
          },
        },
      }),
    );
    return this.parse<ShoppingFilters>(response.output_text);
  }

  async composeShoppingAnswer(
    message: string,
    history: { role: string; content: string }[],
    filters: ShoppingFilters,
    products: GroundedProduct[],
    safetyIdentifier: string,
  ): Promise<ShoppingAnswer> {
    const response = await this.request(() =>
      this.openai.responses.create({
        model: this.model,
        reasoning: { effort: 'low' },
        safety_identifier: safetyIdentifier,
        instructions:
          'You are Nexa Commerce shopping help. Respond only to shopping and general store questions. For unrelated requests, briefly redirect the user to store help. Refuse unsafe or harmful instructions without elaborating. Use only the supplied store context and catalog results. Recommend only products in catalogResults and return their exact IDs with a short grounded reason. Never invent availability, pricing, features, policies, or product facts. If no products match, explain which filters were restrictive and suggest one or two useful alternatives. If clarification is needed, ask one focused question. Keep the answer concise and natural.',
        input: JSON.stringify({
          history,
          message,
          filters,
          catalogResults: products,
          storeContext: {
            currency: 'GEL',
            productUrlsUseSlugs: true,
            availabilityReflectsCurrentInventory: true,
          },
        }),
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'shopping_answer',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                answer: { type: 'string' },
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      productId: { type: 'string' },
                      reason: { type: 'string' },
                    },
                    required: ['productId', 'reason'],
                  },
                },
                clarificationNeeded: { type: 'boolean' },
              },
              required: ['answer', 'recommendations', 'clarificationNeeded'],
            },
          },
        },
      }),
    );
    return this.parse<ShoppingAnswer>(response.output_text);
  }

  async composeSupportAnswer(
    message: string,
    history: { role: string; content: string }[],
    context: object,
    safetyIdentifier: string,
  ): Promise<SupportAnswer> {
    const response = await this.request(() =>
      this.openai.responses.create({
        model: this.model,
        reasoning: { effort: 'low' },
        safety_identifier: safetyIdentifier,
        instructions:
          'You are Nexa Commerce customer support. Respond only to shipping, returns, payments, accounts, order status, tickets, and general store support. For unrelated requests, briefly redirect to store support. Refuse unsafe or harmful instructions and never request passwords, full card numbers, security codes, or bank credentials. Use only the supplied store facts and authenticated customer context. Never invent policies, delivery dates, refunds, payment state, or order details. Use only exact order IDs present in context. Escalate when the customer asks for a human or when the issue needs investigation or an action you cannot perform. When escalating, prepare a concise title, conversation summary, category, priority, and related order ID; explain that ticket creation requires confirmation and never claim a ticket was already created. Do not escalate a basic question that the supplied facts fully answer. Be concise and empathetic.',
        input: JSON.stringify({ history, message, context }),
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'support_answer',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                answer: { type: 'string' },
                escalationNeeded: { type: 'boolean' },
                escalationReason: { type: ['string', 'null'] },
                ticketSubject: { type: ['string', 'null'] },
                conversationSummary: { type: ['string', 'null'] },
                suggestedCategory: {
                  type: 'string',
                  enum: [
                    'SHIPPING',
                    'RETURNS',
                    'PAYMENT',
                    'ACCOUNT',
                    'ORDER',
                    'OTHER',
                  ],
                },
                priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH'] },
                relatedOrderId: { type: ['string', 'null'] },
              },
              required: [
                'answer',
                'escalationNeeded',
                'escalationReason',
                'ticketSubject',
                'conversationSummary',
                'suggestedCategory',
                'priority',
                'relatedOrderId',
              ],
            },
          },
        },
      }),
    );
    return this.parse<SupportAnswer>(response.output_text);
  }

  generateProductCopy(notes: string, tone: string, safetyIdentifier: string) {
    return this.structured<ProductCopy>(
      'product_copy',
      'Create accurate commerce copy using only the supplied rough notes. Never invent materials, compatibility, certifications, dimensions, warranties, or performance claims. Make the description useful and polished.',
      { notes, tone },
      safetyIdentifier,
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          nameSuggestion: { type: 'string' },
          shortDescription: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['nameSuggestion', 'shortDescription', 'description', 'tags'],
      },
    );
  }

  summarizeReviews(context: object, safetyIdentifier: string) {
    return this.structured<ReviewSummary>(
      'review_summary',
      'Summarize only the supplied customer reviews. Separate recurring strengths and concerns. Treat small samples cautiously and never invent feedback.',
      context,
      safetyIdentifier,
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' } },
          concerns: { type: 'array', items: { type: 'string' } },
          sentiment: {
            type: 'string',
            enum: ['POSITIVE', 'MIXED', 'NEGATIVE', 'INSUFFICIENT_DATA'],
          },
        },
        required: ['summary', 'strengths', 'concerns', 'sentiment'],
      },
    );
  }

  summarizeSupportIssues(context: object, safetyIdentifier: string) {
    return this.structured<SupportIssueSummary>(
      'support_issue_summary',
      'Identify recurring issues only from the supplied anonymized support tickets. Frequencies must reflect the supplied sample. Recommendations should be operational and concise.',
      context,
      safetyIdentifier,
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          summary: { type: 'string' },
          recurringIssues: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                issue: { type: 'string' },
                frequency: { type: 'integer' },
                recommendation: { type: 'string' },
              },
              required: ['issue', 'frequency', 'recommendation'],
            },
          },
        },
        required: ['summary', 'recurringIssues'],
      },
    );
  }

  draftSupportReply(context: object, safetyIdentifier: string) {
    return this.structured<SupportReplyDraft>(
      'support_reply_draft',
      'Draft a concise, empathetic support reply using only the supplied ticket, order, store facts, and staff guidance. Never promise refunds, delivery dates, replacements, or actions not present in context. Flag anything staff must verify. Return a draft only.',
      context,
      safetyIdentifier,
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          reply: { type: 'string' },
          requiresHumanVerification: { type: 'boolean' },
          verificationNotes: { type: 'array', items: { type: 'string' } },
        },
        required: ['reply', 'requiresHumanVerification', 'verificationNotes'],
      },
    );
  }

  private async structured<T>(
    name: string,
    instructions: string,
    input: object,
    safetyIdentifier: string,
    schema: Record<string, unknown>,
  ): Promise<T> {
    const response = await this.request(() =>
      this.openai.responses.create({
        model: this.model,
        reasoning: { effort: 'low' },
        safety_identifier: safetyIdentifier,
        instructions,
        input: JSON.stringify(input),
        text: {
          verbosity: 'low',
          format: { type: 'json_schema', name, strict: true, schema },
        },
      }),
    );
    return this.parse<T>(response.output_text);
  }

  private get openai() {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI assistant is not configured. Set OPENAI_API_KEY.',
      );
    }
    return this.client;
  }

  private async request<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof OpenAI.RateLimitError) {
        throw new HttpException(
          'AI service is temporarily busy. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new GatewayTimeoutException(
          'AI service did not respond in time. Please try again.',
        );
      }
      if (error instanceof OpenAI.APIConnectionError) {
        throw new ServiceUnavailableException(
          'AI service is temporarily unavailable. Please try again later.',
        );
      }
      if (error instanceof OpenAI.APIError) {
        throw new BadGatewayException(
          'AI service could not complete the request. Please try again.',
        );
      }

      throw new BadGatewayException(
        'AI service returned an unexpected error. Please try again.',
      );
    }
  }

  private parse<T>(output: string): T {
    if (!output) {
      throw new ServiceUnavailableException('AI assistant returned no output.');
    }
    try {
      return JSON.parse(output) as T;
    } catch {
      throw new BadGatewayException(
        'AI service returned an invalid response. Please try again.',
      );
    }
  }
}
