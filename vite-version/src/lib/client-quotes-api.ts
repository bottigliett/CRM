const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Contact {
  id: number;
  name: string;
  email: string | null;
}

export interface QuoteObjective {
  title: string;
  description: string;
}

export interface QuoteItem {
  id: number;
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface QuotePackageItem {
  itemName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string;
}

export interface QuotePackage {
  id: number;
  name: string;
  description: string | null;
  price: number;
  features: string | string[];  // Can be JSON string or parsed array
  recommended: boolean;
  order: number;
  items: QuotePackageItem[];
}

export interface Quote {
  id: number;
  quoteNumber: string;
  contactId: number;
  title: string;
  description: string | null;
  objectives: QuoteObjective[] | string | null;  // Can be JSON string or parsed array
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  total: number;
  enablePaymentPlans: boolean;
  oneTimeDiscount: number;
  payment2Discount: number;
  payment3Discount: number;
  payment4Discount: number;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  validUntil: string;
  acceptedDate: string | null;
  selectedPackageId: number | null;
  selectedPaymentOption: string | null;
  projectDurationDays: number | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  items: QuoteItem[];
  packages: QuotePackage[];
}

export interface QuoteResponse {
  success: boolean;
  data: Quote;
  message?: string;
}

class ClientQuotesAPI {
  private getAuthToken(): string | null {
    // Check for preview token first (sessionStorage)
    const previewToken = sessionStorage.getItem('client_preview_token');
    if (previewToken) {
      return previewToken;
    }
    // Fallback to regular auth token (localStorage)
    return localStorage.getItem('client_auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();

    if (!token) {
      throw new Error('Token non fornito');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'An error occurred');
    }

    return response.json();
  }

  /**
   * Get the linked quote for the authenticated client
   */
  async getQuote(): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/client/quotes');
  }

  /**
   * Accept the quote with selected package and payment option
   */
  async acceptQuote(data: {
    selectedPackageId: number;
    selectedPaymentOption: string;
  }): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/client/quotes/accept', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Reject the quote
   */
  async rejectQuote(rejectionReason?: string): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/client/quotes/reject', {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    });
  }

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
  }
}

export const clientQuotesAPI = new ClientQuotesAPI();
