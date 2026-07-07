import { api } from './api';

export interface RecurringInvoice {
  id: number;
  contactId: number;
  clientName: string;
  clientAddress: string | null;
  clientPIva: string | null;
  clientCF: string | null;
  subjectTemplate: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  total: number;
  paymentEntityId: number;
  paymentDays: number;
  generationDay: number;
  fiscalNotes: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: number;
    name: string;
    email?: string;
    type?: string;
  };
  paymentEntity?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  };
  generations?: RecurringInvoiceGeneration[];
}

export interface RecurringInvoiceGeneration {
  id: number;
  recurringInvoiceId: number;
  invoiceId: number;
  month: number;
  year: number;
  generatedAt: string;
  invoice?: {
    id: number;
    invoiceNumber: string;
    status: string;
    total: number;
  };
}

export interface CreateRecurringInvoiceData {
  contactId: number;
  clientName: string;
  clientAddress?: string;
  clientPIva?: string;
  clientCF?: string;
  subjectTemplate: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  subtotal?: number;
  vatPercentage?: number;
  vatAmount?: number;
  total?: number;
  paymentEntityId: number;
  paymentDays?: number;
  generationDay?: number;
  fiscalNotes?: string;
}

export interface UpdateRecurringInvoiceData extends Partial<CreateRecurringInvoiceData> {}

export interface GenerationStatus {
  recurringInvoiceId: number;
  clientName: string;
  subjectTemplate: string;
  total: number;
  generated: boolean;
  invoice: {
    id: number;
    invoiceNumber: string;
    status: string;
  } | null;
}

export const recurringInvoicesAPI = {
  async getAll(): Promise<{ success: boolean; data: RecurringInvoice[] }> {
    return await api.get('/recurring-invoices');
  },

  async getById(id: number): Promise<{ success: boolean; data: RecurringInvoice }> {
    return await api.get(`/recurring-invoices/${id}`);
  },

  async create(data: CreateRecurringInvoiceData): Promise<{ success: boolean; data: RecurringInvoice; message: string }> {
    return await api.post('/recurring-invoices', data);
  },

  async update(id: number, data: UpdateRecurringInvoiceData): Promise<{ success: boolean; data: RecurringInvoice; message: string }> {
    return await api.put(`/recurring-invoices/${id}`, data);
  },

  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/recurring-invoices/${id}`);
  },

  async generateMonthly(month: number, year: number): Promise<{
    success: boolean;
    message: string;
    data: {
      generated: number;
      skipped: number;
      invoices: any[];
    };
  }> {
    return await api.post('/recurring-invoices/generate', { month, year });
  },

  async getGenerationStatus(month: number, year: number): Promise<{ success: boolean; data: GenerationStatus[] }> {
    return await api.get(`/recurring-invoices/generation-status?month=${month}&year=${year}`);
  },
};
