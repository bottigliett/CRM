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

export interface PersonalInvoice {
  id: number;
  invoiceNumber: string;
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
  updatedAt: string;
}

class PersonalInvoicesAPI {
  async getInvoices(_params: any = {}): Promise<{ success: boolean; data: { invoices: PersonalInvoice[]; pagination: { total: number; page: number; limit: number; totalPages: number } } }> {
    const r = await request<{ success: boolean; data: PersonalInvoice[] }>('/developer/personal/invoices');
    const invoices = r.data || [];
    return { success: true, data: { invoices, pagination: { total: invoices.length, page: 1, limit: 1000, totalPages: 1 } } };
  }

  async getInvoiceById(id: number) {
    return request<{ success: boolean; data: PersonalInvoice }>(`/developer/personal/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return request<{ success: boolean; data: PersonalInvoice }>('/developer/personal/invoices', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateInvoice(id: number, data: any) {
    return request<{ success: boolean; data: PersonalInvoice }>(`/developer/personal/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async patchInvoice(id: number, data: any) {
    return request<{ success: boolean }>(`/developer/personal/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteInvoice(id: number) {
    return request<{ success: boolean }>(`/developer/personal/invoices/${id}`, { method: 'DELETE' });
  }

  async duplicateInvoice(id: number) {
    return request<{ success: boolean; data: PersonalInvoice }>(`/developer/personal/invoices/${id}/duplicate`, { method: 'POST' });
  }

  async getNextInvoiceNumber() {
    return request<{ success: boolean; data: { invoiceNumber: string } }>('/developer/personal/invoices/next-number');
  }

  async getInvoicePDFData(id: number) {
    const r = await request<{ success: boolean; data: any }>(`/developer/personal/invoices/${id}`);
    const inv = r.data;
    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    const fmtIssue = (iso: string) => {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '' : `${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
    };
    const fmtDue = (iso: string) => {
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };
    let services: any[] = [];
    try {
      const parsed = inv.description ? JSON.parse(inv.description) : [];
      services = Array.isArray(parsed) ? parsed.map((s: any) => ({
        description: s.description,
        quantity: String(s.quantity),
        unitPrice: Number(s.unitPrice) > 0 ? Number(s.unitPrice).toFixed(2).replace('.', ',') : '',
      })) : [];
    } catch {
      services = [{
        description: inv.description || inv.subject,
        quantity: String(inv.quantity),
        unitPrice: Number(inv.unitPrice) > 0 ? Number(inv.unitPrice).toFixed(2).replace('.', ',') : '',
      }];
    }
    return {
      ...r,
      data: {
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: fmtIssue(inv.issueDate),
        paymentDays: inv.paymentDays,
        dueDate: fmtDue(inv.dueDate),
        clientName: inv.clientName,
        clientAddress: inv.clientAddress,
        clientPIva: inv.clientPIva,
        clientCF: inv.clientCF,
        subject: inv.subject,
        services,
        subtotal: Number(inv.subtotal).toFixed(2).replace('.', ','),
        vatPercentage: String(Math.round(Number(inv.vatPercentage))),
        vatAmount: Number(inv.vatAmount).toFixed(2).replace('.', ','),
        total: Number(inv.total).toFixed(2).replace('.', ','),
        fiscalNotes: inv.fiscalNotes,
        isVatZero: Number(inv.vatPercentage) === 0,
        paymentBeneficiary: inv.paymentEntity?.beneficiary || 'DAVIDE MARANGONI',
        paymentIban: inv.paymentEntity?.iban || 'LT95 3250 0482 6617 5203',
        paymentBank: inv.paymentEntity?.bankName || 'REVOLUT BANK UAB',
        paymentBic: inv.paymentEntity?.bic || 'REVOLT21',
        paymentSdi: inv.paymentEntity?.sdi || 'JI3TXCE',
        personal: true,
      },
    };
  }

  async reserveTaxes(id: number, taxPercentage?: number) {
    return request<{ success: boolean; message: string }>(`/developer/personal/invoices/${id}/reserve-taxes`, { method: 'POST', body: JSON.stringify({ taxPercentage }) });
  }
}

export const personalInvoicesAPI = new PersonalInvoicesAPI();
// Alias so duplicated invoices components can keep the same import name.
export const invoicesAPI = personalInvoicesAPI;
