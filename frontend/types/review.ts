export interface Review {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { firstName: string; lastInitial: string };
}

export interface ReviewListResponse {
  items: Review[];
  summary: {
    average: number | null;
    count: number;
    distribution: Record<string, number>;
  };
  pagination: { page: number; limit: number; total: number; pages: number };
}
