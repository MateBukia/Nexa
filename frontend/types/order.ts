export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderAddress {
  firstName: string;
  lastName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  variantName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
  totalPrice: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  grandTotal: string;
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress | null;
  notes?: string | null;
  items: OrderItem[];
  payments: { id: string; status: string; provider: string; amount: string }[];
  user: { id: string; email: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  items: Order[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
