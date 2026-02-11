import { api } from './api';

export interface PaymentEntity {
  id: number;
  name: string;
  beneficiary: string;
  iban: string;
  bankName: string;
  bic: string | null;
  sdi: string | null;
  taxId: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentEntityData {
  name: string;
  beneficiary: string;
  iban: string;
  bankName: string;
  bic?: string;
  sdi?: string;
  taxId?: string;
  isDefault?: boolean;
}

export interface UpdatePaymentEntityData extends Partial<CreatePaymentEntityData> {
  isActive?: boolean;
}

export const paymentEntityAPI = {
  /**
   * Get all payment entities
   */
  async getAll(activeOnly: boolean = false): Promise<{ success: boolean; data: PaymentEntity[] }> {
    return await api.get(`/payment-entities?activeOnly=${activeOnly}`);
  },

  /**
   * Get single payment entity by ID
   */
  async getById(id: number): Promise<{ success: boolean; data: PaymentEntity }> {
    return await api.get(`/payment-entities/${id}`);
  },

  /**
   * Create new payment entity (DEVELOPER only)
   */
  async create(data: CreatePaymentEntityData): Promise<{ success: boolean; data: PaymentEntity; message: string }> {
    return await api.post('/payment-entities', data);
  },

  /**
   * Update payment entity (DEVELOPER only)
   */
  async update(id: number, data: UpdatePaymentEntityData): Promise<{ success: boolean; data: PaymentEntity; message: string }> {
    return await api.put(`/payment-entities/${id}`, data);
  },

  /**
   * Delete payment entity (DEVELOPER only)
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/payment-entities/${id}`);
  },

  /**
   * Set as default payment entity (DEVELOPER only)
   */
  async setDefault(id: number): Promise<{ success: boolean; data: PaymentEntity; message: string }> {
    return await api.post(`/payment-entities/${id}/set-default`);
  },
};
