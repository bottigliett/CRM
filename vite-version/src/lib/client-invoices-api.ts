const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Invoice {
  id: number;
  invoiceNumber: string;
  contactId?: number;
  clientName: string;
  clientAddress?: string;
  clientPIva?: string;
  clientCF?: string;
  subject: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  total: number;
  issueDate: string;
  dueDate: string;
  paymentDays: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paymentDate?: string;
  paymentMethod?: string;
  paymentNotes?: string;
  fiscalNotes?: string;
  pdfPath?: string;
  pdfGeneratedAt?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  taxReserved: boolean;
  taxAmount?: number;
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  isOverdue?: boolean;
}

class ClientInvoicesAPI {
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

  async getInvoices(params: { limit?: number; status?: string } = {}): Promise<{
    success: boolean;
    data: Invoice[];
  }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request<any>(`/client/invoices${query ? `?${query}` : ''}`);
  }

  async getInvoiceById(id: number): Promise<{
    success: boolean;
    data: Invoice;
  }> {
    return this.request<any>(`/client/invoices/${id}`);
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
    return this.request<any>(`/client/invoices/${id}/pdf`);
  }
}

export const clientInvoicesAPI = new ClientInvoicesAPI();
