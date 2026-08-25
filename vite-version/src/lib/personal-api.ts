const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('client_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Errore' }));
    throw new Error(err.message || 'Errore');
  }
  return res.json();
}

export interface PersonalClient {
  id: number;
  name: string;
  address?: string;
  piva?: string;
  cf?: string;
}

export interface PersonalInvoice {
  id: number;
  invoiceNumber: string;
  personalClientId?: number;
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
  taxReserved: boolean;
  taxAmount?: number;
  electronicInvoiceNumber?: string;
  fiscalNotes?: string;
  createdAt: string;
  personalClient?: PersonalClient;
}

export const personalAPI = {
  getClients: () => request<{ success: boolean; data: PersonalClient[] }>('/developer/personal/clients'),
  createClient: (data: Partial<PersonalClient>) =>
    request<{ success: boolean; data: PersonalClient }>('/developer/personal/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: Partial<PersonalClient>) =>
    request<{ success: boolean; data: PersonalClient }>(`/developer/personal/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: number) =>
    request<{ success: boolean }>(`/developer/personal/clients/${id}`, { method: 'DELETE' }),

  getInvoices: () => request<{ success: boolean; data: PersonalInvoice[] }>('/developer/personal/invoices'),
  createInvoice: (data: any) =>
    request<{ success: boolean; data: PersonalInvoice }>('/developer/personal/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: number, data: any) =>
    request<{ success: boolean; data: PersonalInvoice }>(`/developer/personal/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: number) =>
    request<{ success: boolean }>(`/developer/personal/invoices/${id}`, { method: 'DELETE' }),

  getComparison: (granularity: 'monthly' | 'yearly') =>
    request<{ success: boolean; data: Array<{ period: string; davide: number; stefano: number }> }>(
      `/developer/personal/comparison?granularity=${granularity}`
    ),

  getRecurring: () => request<{ success: boolean; data: any[] }>('/developer/personal/recurring'),
  createRecurring: (data: any) => request<{ success: boolean; data: any }>('/developer/personal/recurring', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurring: (id: number, data: any) => request<{ success: boolean; data: any }>(`/developer/personal/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRecurring: (id: number) => request<{ success: boolean }>(`/developer/personal/recurring/${id}`, { method: 'DELETE' }),
  generateRecurring: (id: number) => request<{ success: boolean; data: any }>(`/developer/personal/recurring/${id}/generate`, { method: 'POST' }),
};
