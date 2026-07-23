import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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
export class OpenAiService {
  private readonly client: OpenAI | null;
  readonly model: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    this.model = config.get<string>('AI_MODEL', 'gpt-5.6-terra');
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async extractShoppingFilters(
    message: string,
    history: { role: string; content: string }[],
    safetyIdentifier: string,
  ): Promise<ShoppingFilters> {
    const response = await this.openai.responses.create({
      model: this.model,
      reasoning: { effort: 'low' },
      safety_identifier: safetyIdentifier,
      instructions:
        'Extract only explicit or strongly implied product-search constraints. Use GEL for prices. Keep terms short and useful for matching product names, descriptions, brands, or tags. Use null when a constraint is absent.',
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
              terms: { type: 'array', items: { type: 'string' } },
              category: { type: ['string', 'null'] },
              minPrice: { type: ['number', 'null'] },
              maxPrice: { type: ['number', 'null'] },
              attributes: { type: 'array', items: { type: 'string' } },
            },
            required: [
              'terms',
              'category',
              'minPrice',
              'maxPrice',
              'attributes',
            ],
          },
        },
      },
    });
    return this.parse<ShoppingFilters>(response.output_text);
  }

  async composeShoppingAnswer(
    message: string,
    history: { role: string; content: string }[],
    filters: ShoppingFilters,
    products: GroundedProduct[],
    safetyIdentifier: string,
  ): Promise<ShoppingAnswer> {
    const response = await this.openai.responses.create({
      model: this.model,
      reasoning: { effort: 'low' },
      safety_identifier: safetyIdentifier,
      instructions:
        'You are Nexa Commerce shopping help. Recommend only products in the provided catalog results and only return their exact IDs. Never invent availability, pricing, features, or policies. Explain why each recommendation fits. If results are weak or empty, say so directly and ask one useful clarifying question. Keep the answer concise and natural.',
      input: JSON.stringify({
        history,
        message,
        filters,
        catalogResults: products,
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
              recommendedProductIds: {
                type: 'array',
                items: { type: 'string' },
              },
              clarificationNeeded: { type: 'boolean' },
            },
            required: [
              'answer',
              'recommendedProductIds',
              'clarificationNeeded',
            ],
          },
        },
      },
    });
    return this.parse<ShoppingAnswer>(response.output_text);
  }

  async composeSupportAnswer(
    message: string,
    history: { role: string; content: string }[],
    context: object,
    safetyIdentifier: string,
  ): Promise<SupportAnswer> {
    const response = await this.openai.responses.create({
      model: this.model,
      reasoning: { effort: 'low' },
      safety_identifier: safetyIdentifier,
      instructions:
        'You are Nexa Commerce customer support. Answer only from the supplied store facts and customer context. Never invent policies, delivery dates, refunds, payment state, or order details. Use only exact order IDs present in context. Escalate when the customer asks for a human or when the issue needs account/order investigation or an action you cannot perform. Do not escalate a basic question that the supplied facts fully answer. Be concise and empathetic.',
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
              priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH'] },
              relatedOrderId: { type: ['string', 'null'] },
            },
            required: [
              'answer',
              'escalationNeeded',
              'escalationReason',
              'ticketSubject',
              'priority',
              'relatedOrderId',
            ],
          },
        },
      },
    });
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
    const response = await this.openai.responses.create({
      model: this.model,
      reasoning: { effort: 'low' },
      safety_identifier: safetyIdentifier,
      instructions,
      input: JSON.stringify(input),
      text: {
        verbosity: 'low',
        format: { type: 'json_schema', name, strict: true, schema },
      },
    });
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

  private parse<T>(output: string): T {
    if (!output) {
      throw new ServiceUnavailableException('AI assistant returned no output.');
    }
    return JSON.parse(output) as T;
  }
}
