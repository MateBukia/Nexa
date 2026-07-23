export interface CartItem {
  id: string;
  quantity: number;
  lineTotal: number;
  variant: {
    id: string;
    sku: string;
    name: string;
    price: string;
    compareAtPrice?: string | null;
    availableQuantity: number;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    status: string;
    category: { name: string; slug: string };
    image?: { url: string; altText?: string | null } | null;
  };
}

export interface Cart {
  id: string;
  items: CartItem[];
  summary: {
    itemCount: number;
    subtotal: number;
    currency: "GEL";
  };
  updatedAt: string;
}
