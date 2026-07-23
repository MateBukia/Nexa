export interface DashboardAnalytics {
  period: { days: number; from: string; to: string };
  sales: {
    revenue: number;
    previousRevenue: number;
    changePercent: number | null;
    orders: number;
  };
  totals: {
    orders: number;
    activeProducts: number;
    customers: number;
    openSupport: number;
    lowStock: number;
  };
  ordersByStatus: { status: string; count: number }[];
  supportByStatus: { status: string; count: number }[];
  lowStock: {
    inventoryId: string;
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    sku: string;
    available: number;
    threshold: number;
  }[];
  topProducts: {
    productId: string | null;
    productName: string;
    units: number;
    revenue: number;
  }[];
}
