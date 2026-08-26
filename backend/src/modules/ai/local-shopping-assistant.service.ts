import { Injectable } from '@nestjs/common';
import {
  GroundedProduct,
  ShoppingAnswer,
  ShoppingFilters,
  ShoppingIntent,
} from './ai.types';

const COLORS = [
  'black',
  'white',
  'red',
  'blue',
  'green',
  'yellow',
  'orange',
  'purple',
  'pink',
  'brown',
  'grey',
  'gray',
  'silver',
  'gold',
  'beige',
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'any',
  'are',
  'available',
  'below',
  'between',
  'buy',
  'by',
  'can',
  'cheaper',
  'could',
  'find',
  'for',
  'gel',
  'give',
  'have',
  'i',
  'in',
  'eu',
  'is',
  'looking',
  'me',
  'of',
  'or',
  'please',
  'product',
  'products',
  'recommend',
  'size',
  'show',
  'some',
  'than',
  'that',
  'the',
  'to',
  'under',
  'uk',
  'us',
  'want',
  'with',
  'you',
]);

@Injectable()
export class LocalShoppingAssistantService {
  readonly model = 'local-catalog-rules-v1';

  extractShoppingFilters(
    message: string,
    _history?: { role: string; content: string }[],
  ): Promise<ShoppingFilters> {
    void _history;
    const normalized = message.toLowerCase().replace(/,/g, ' ');
    const numbers = [...normalized.matchAll(/\b(\d+(?:\.\d{1,2})?)\b/g)].map(
      (match) => Number(match[1]),
    );
    const range = normalized.match(
      /(?:between|from)\s+(\d+(?:\.\d{1,2})?)\s+(?:and|to|-)\s+(\d+(?:\.\d{1,2})?)/,
    );
    const maxMatch = normalized.match(
      /(?:under|below|less than|up to|max(?:imum)?)\s+(\d+(?:\.\d{1,2})?)/,
    );
    const minMatch = normalized.match(
      /(?:over|above|more than|at least|min(?:imum)?)\s+(\d+(?:\.\d{1,2})?)/,
    );
    const color = COLORS.find((candidate) =>
      new RegExp(`\\b${candidate}\\b`).test(normalized),
    );
    const sizeMatch = normalized.match(
      /\b(?:size\s*)?(xxs|xs|s|m|l|xl|xxl|xxxl|eu\s*\d{2}|uk\s*\d{1,2}|us\s*\d{1,2}|\d{1,3}\s*(?:gb|tb))\b/i,
    );
    const brandMatch = normalized.match(
      /\b(?:brand|by)\s+([\p{L}\d][\p{L}\d-]*)/u,
    );
    const categoryMatch = normalized.match(
      /\bcategory\s+([\p{L}\d][\p{L}\d-]*)/u,
    );
    const intent = this.intent(normalized);
    const excluded = new Set([
      ...COLORS,
      color ?? '',
      sizeMatch?.[1]?.toLowerCase() ?? '',
      brandMatch?.[1]?.toLowerCase() ?? '',
      categoryMatch?.[1]?.toLowerCase() ?? '',
      ...numbers.map(String),
    ]);
    const keywords = normalized
      .replace(/[^\p{L}\p{N}-]+/gu, ' ')
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 1 && !STOP_WORDS.has(word) && !excluded.has(word),
      )
      .slice(0, 8);

    return Promise.resolve({
      intent,
      keywords,
      category: categoryMatch?.[1] ?? null,
      minPrice: range
        ? Number(range[1])
        : minMatch
          ? Number(minMatch[1])
          : null,
      maxPrice: range
        ? Number(range[2])
        : maxMatch
          ? Number(maxMatch[1])
          : null,
      color: color === 'gray' ? 'grey' : (color ?? null),
      size: sizeMatch?.[1]?.replace(/\s+/g, ' ').toUpperCase() ?? null,
      brand: brandMatch?.[1] ?? null,
    });
  }

  composeShoppingAnswer(
    _message: string,
    _history: { role: string; content: string }[],
    filters: ShoppingFilters,
    products: GroundedProduct[],
  ): Promise<ShoppingAnswer> {
    if (filters.intent === 'STORE_INFORMATION') {
      return Promise.resolve({
        answer:
          'I can help you search this store by product, category, brand, colour, size, and price.',
        recommendations: [],
        clarificationNeeded: false,
      });
    }
    if (!products.length) {
      return Promise.resolve({
        answer: '',
        recommendations: [],
        clarificationNeeded: true,
      });
    }

    const recommendations = products.slice(0, 5).map((product) => ({
      productId: product.id,
      reason: this.reason(product, filters),
    }));
    return Promise.resolve({
      answer: `I found ${products.length} available ${products.length === 1 ? 'product' : 'products'} matching your request. Here ${recommendations.length === 1 ? 'is the best match' : 'are the best matches'}.`,
      recommendations,
      clarificationNeeded: false,
    });
  }

  private intent(message: string): ShoppingIntent {
    if (/\b(compare|versus|vs)\b/.test(message)) return 'COMPARISON';
    if (/\b(stock|available|availability)\b/.test(message))
      return 'AVAILABILITY';
    if (/\b(recommend|suggest|best)\b/.test(message)) return 'RECOMMENDATION';
    if (
      /\b(store|shop|shipping|return|payment|hours|location)\b/.test(message)
    ) {
      return 'STORE_INFORMATION';
    }
    return 'PRODUCT_SEARCH';
  }

  private reason(product: GroundedProduct, filters: ShoppingFilters) {
    const matches = [
      filters.category ? `${product.category} category` : null,
      filters.brand && product.brand ? `${product.brand} brand` : null,
      filters.color ? filters.color : null,
      filters.size ? `size ${filters.size}` : null,
      filters.maxPrice !== null
        ? `within your ${filters.maxPrice} GEL budget`
        : null,
    ].filter(Boolean);
    return matches.length
      ? `Matches ${matches.join(', ')}.`
      : 'Available in the catalogue now.';
  }
}
