import { api } from './api';

export interface Contact {
  id: number;
  name: string;
  email: string | null;
}

export interface QuoteItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface QuotePackageItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface QuotePackage {
  id?: number;
  name: string;
  description: string | null;
  basePrice: number;
  features: string;
  recommended: boolean;
  items: QuotePackageItem[];
}

export interface Quote {
  id: number;
  quoteNumber: string;
  contactId: number;
  title: string;
  description: string | null;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  total: number;
  oneTimeDiscount: number;
  payment2Discount: number;
  payment3Discount: number;
  payment4Discount: number;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  validUntil: string;
  acceptedDate: string | null;
  selectedPackageId: number | null;
  selectedPaymentOption: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  items: QuoteItem[];
  packages: QuotePackage[];
}

export interface CreateQuoteData {
  contactId: number;
  title: string;
  description?: string;
  validUntil: string;
  discountAmount?: number;
  taxRate?: number;
  oneTimeDiscount?: number;
  payment2Discount?: number;
  payment3Discount?: number;
  payment4Discount?: number;
  items?: Omit<QuoteItem, 'id'>[];
  packages?: Array<{
    name: string;
    description?: string;
    basePrice: number;
    features: string;
    recommended: boolean;
    items: QuotePackageItem[];
  }>;
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  selectedPackageId?: number | null;
  selectedPaymentOption?: string | null;
}

export interface QuoteListResponse {
  success: boolean;
  data: Quote[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface QuoteResponse {
  success: boolean;
  data: Quote;
  message?: string;
}

export interface PricingCategory {
  min: number;
  max: number;
  label: string;
}

export interface PricingGuide {
  sito_web: Record<string, PricingCategory>;
  brand_design: Record<string, PricingCategory>;
  graphic_design: Record<string, PricingCategory>;
  strategia: Record<string, PricingCategory>;
  extra: Record<string, PricingCategory>;
}

export interface PricingGuideResponse {
  success: boolean;
  data: PricingGuide;
}

export const quotesAPI = {
  /**
   * Get pricing guide
   */
  async getPricingGuide(): Promise<PricingGuideResponse> {
    return await api.get('/quotes/pricing-guide');
  },

  /**
   * Get all quotes with filters
   */
  async getAll(params?: {
    search?: string;
    status?: string;
    contactId?: number;
    page?: number;
    limit?: number;
  }): Promise<QuoteListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.contactId) queryParams.append('contactId', params.contactId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/quotes?${queryParams.toString()}`);

    return {
      success: response.success,
      data: response.data.quotes,
      pagination: {
        total: response.data.total,
        page: params?.page || 1,
        limit: response.data.limit,
        pages: Math.ceil(response.data.total / response.data.limit),
      },
    };
  },

  /**
   * Get single quote by ID
   */
  async getById(id: number): Promise<QuoteResponse> {
    return await api.get(`/quotes/${id}`);
  },

  /**
   * Create new quote
   */
  async create(data: CreateQuoteData): Promise<QuoteResponse> {
    return await api.post('/quotes', data);
  },

  /**
   * Update quote
   */
  async update(id: number, data: UpdateQuoteData): Promise<QuoteResponse> {
    return await api.put(`/quotes/${id}`, data);
  },

  /**
   * Delete quote
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/quotes/${id}`);
  },

  /**
   * Calculate totals for quote items
   */
  calculateTotals(
    items: QuoteItem[],
    discountAmount: number = 0,
    taxRate: number = 22
  ): {
    subtotal: number;
    afterDiscount: number;
    taxAmount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      afterDiscount,
      taxAmount,
      total,
    };
  },

  /**
   * Calculate package total with discount
   */
  calculatePackageTotal(
    basePrice: number,
    paymentOption: 'oneTime' | 'payment2' | 'payment3' | 'payment4',
    discounts: {
      oneTimeDiscount: number;
      payment2Discount: number;
      payment3Discount: number;
      payment4Discount: number;
    }
  ): number {
    const discountMap = {
      oneTime: discounts.oneTimeDiscount,
      payment2: discounts.payment2Discount,
      payment3: discounts.payment3Discount,
      payment4: discounts.payment4Discount,
    };

    const discount = discountMap[paymentOption] || 0;
    return basePrice - (basePrice * discount) / 100;
  },
};
