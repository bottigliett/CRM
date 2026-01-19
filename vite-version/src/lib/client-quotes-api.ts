import { clientApi } from './client-api';

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
  basePrice: number;
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

export interface QuoteResponse {
  success: boolean;
  data: Quote;
  message?: string;
}

export const clientQuotesAPI = {
  /**
   * Get the linked quote for the authenticated client
   */
  async getQuote(): Promise<QuoteResponse> {
    return await clientApi.get('/client/quotes');
  },

  /**
   * Accept the quote with selected package and payment option
   */
  async acceptQuote(data: {
    selectedPackageId: number;
    selectedPaymentOption: string;
  }): Promise<QuoteResponse> {
    return await clientApi.put('/client/quotes/accept', data);
  },

  /**
   * Reject the quote
   */
  async rejectQuote(): Promise<QuoteResponse> {
    return await clientApi.put('/client/quotes/reject', {});
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
