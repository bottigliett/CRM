const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Invoice {
  id: number;
  invoiceNumber: string;

  // Client information
  contactId?: number;
  clientName: string;
  clientAddress?: string;
  clientPIva?: string;
  clientCF?: string;

  // Invoice details
  subject: string;
  description?: string;

  // Amounts
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  total: number;

  // Dates
  issueDate: string;
  dueDate: string;
  paymentDays: number;

  // Status
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paymentDate?: string;
  paymentMethod?: string;
  paymentNotes?: string;

  // Legal notes
  fiscalNotes?: string;

  // PDF generation
  pdfPath?: string;
  pdfGeneratedAt?: string;

  // Metadata
  createdBy: number;
  createdAt: string;
  updatedAt: string;

  // Tax reserve
  taxReserved: boolean;
  taxAmount?: number;

  // Relations
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    type?: string;
  };
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };

  // Computed
  isOverdue?: boolean;
}

export interface InvoiceStatistics {
  totalIssued: number;
  totalCollected: number;
  totalPending: number;
  overdueCount: number;
  overdueAmount: number;
}

export interface GetInvoicesParams {
  page?: number;
  limit?: number;
  status?: 'all' | 'draft' | 'issued' | 'paid' | 'cancelled' | 'overdue';
  period?: 'all' | 'this-month' | 'this-quarter' | 'this-year' | 'last-month' | 'last-quarter' | 'last-year';
  year?: string; // Specific year filter (e.g., "2026", "2025")
  search?: string;
  unpaidOnly?: boolean;
  currentYear?: boolean;
  includeStats?: boolean;
}

export interface CreateInvoiceData {
  contactId?: number;
  clientName: string;
  clientAddress?: string;
  clientPIva?: string;
  clientCF?: string;

  subject: string;
  description?: string;

  quantity?: number;
  unitPrice: number;
  vatPercentage?: number;

  issueDate: string;
  dueDate?: string;
  paymentDays?: number;

  status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paymentDate?: string;
  paymentMethod?: string;
  paymentNotes?: string;

  fiscalNotes?: string;

  invoiceNumber?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {}

class InvoicesAPI {
  private getAuthToken(): string | null {
    // Try client token first, then admin token
    return localStorage.getItem('client_auth_token') || localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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

  async getInvoices(params: GetInvoicesParams = {}): Promise<{
    success: boolean;
    data: {
      invoices: Invoice[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
      statistics?: InvoiceStatistics;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.period) queryParams.append('period', params.period);
    if (params.search) queryParams.append('search', params.search);
    if (params.unpaidOnly) queryParams.append('unpaidOnly', 'true');
    if (params.currentYear !== undefined) queryParams.append('currentYear', params.currentYear.toString());
    if (params.includeStats) queryParams.append('includeStats', 'true');

    const query = queryParams.toString();
    return this.request<any>(`/invoices${query ? `?${query}` : ''}`);
  }

  async getInvoiceById(id: number): Promise<{
    success: boolean;
    data: Invoice;
  }> {
    return this.request<any>(`/invoices/${id}`);
  }

  async createInvoice(data: CreateInvoiceData): Promise<{
    success: boolean;
    message: string;
    data: Invoice;
  }> {
    return this.request<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvoice(id: number, data: UpdateInvoiceData): Promise<{
    success: boolean;
    message: string;
    data: Invoice;
  }> {
    return this.request<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvoice(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateInvoice(id: number): Promise<{
    success: boolean;
    message: string;
    data: Invoice;
  }> {
    return this.request<any>(`/invoices/${id}/duplicate`, {
      method: 'POST',
    });
  }

  async getNextInvoiceNumber(): Promise<{
    success: boolean;
    data: {
      invoiceNumber: string;
    };
  }> {
    return this.request<any>('/invoices/next-number');
  }

  async getInvoicePDFData(id: number): Promise<{
    success: boolean;
    data: {
      invoiceNumber: string;
      invoiceDate: string;
      dueDate: string;
      clientName: string;
      clientAddress?: string;
      clientPIva?: string;
      clientCF?: string;
      subject: string;
      description: string;
      quantity: string;
      unitPrice: string;
      subtotal: string;
      vatPercentage: string;
      vatAmount: string;
      total: string;
      fiscalNotes?: string;
      isVatZero: boolean;
    };
  }> {
    return this.request<any>(`/invoices/${id}/pdf`);
  }

  async reserveTaxes(id: number, taxPercentage?: number): Promise<{
    success: boolean;
    message: string;
    data: {
      invoice: Invoice;
      taxTransaction: any;
      taxAmount: number;
      taxPercentage: number;
    };
  }> {
    return this.request<any>(`/invoices/${id}/reserve-taxes`, {
      method: 'POST',
      body: JSON.stringify({ taxPercentage }),
    });
  }
}

export const invoicesAPI = new InvoicesAPI();
