import { api } from './api';

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface Quote {
  id: number;
  quoteNumber: string;
  title: string;
  status: string;
  total: number;
}

export interface ClientAccess {
  id: number;
  contactId: number;
  accessType: 'QUOTE_ONLY' | 'FULL_CLIENT';
  username: string;
  emailVerified: boolean;
  isActive: boolean;
  activationToken: string | null;
  activationExpires: string | null;
  projectName: string | null;
  projectDescription: string | null;
  projectObjectives: string | null;
  projectBudget: number | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  monthlyFee: number;
  supportHoursIncluded: number;
  supportHoursUsed: number;
  driveFolderLink: string | null;
  documentsFolder: string | null;
  assetsFolder: string | null;
  invoiceFolder: string | null;
  bespokeDetails: string | null;
  linkedQuoteId: number | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  contact: Contact;
  linkedQuote: Quote | null;
}

export interface CreateClientAccessData {
  contactId: number;
  accessType: 'QUOTE_ONLY' | 'FULL_CLIENT';
  linkedQuoteId?: number | null;
  projectName?: string;
  projectDescription?: string;
  projectObjectives?: string;
  projectBudget?: number;
  projectStartDate?: string;
  projectEndDate?: string;
  monthlyFee?: number;
  supportHoursIncluded?: number;
  driveFolderLink?: string;
  documentsFolder?: string;
  assetsFolder?: string;
  invoiceFolder?: string;
  bespokeDetails?: any;
}

export interface UpdateClientAccessData extends Partial<CreateClientAccessData> {
  isActive?: boolean;
}

export interface UpgradeToFullClientData {
  projectName: string;
  projectDescription?: string;
  projectObjectives?: string;
  projectBudget?: number;
  projectStartDate?: string;
  projectEndDate?: string;
  monthlyFee?: number;
  supportHoursIncluded?: number;
  driveFolderLink?: string;
  documentsFolder?: string;
  assetsFolder?: string;
  invoiceFolder?: string;
  bespokeDetails?: any;
}

export interface ClientAccessListResponse {
  success: boolean;
  data: ClientAccess[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ClientAccessResponse {
  success: boolean;
  data: ClientAccess;
  message?: string;
}

export const clientAccessAPI = {
  /**
   * Get all client accesses with filters
   */
  async getAll(params?: {
    search?: string;
    accessType?: string;
    emailVerified?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ClientAccessListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.accessType) queryParams.append('accessType', params.accessType);
    if (params?.emailVerified !== undefined) queryParams.append('emailVerified', params.emailVerified.toString());
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/client-access?${queryParams.toString()}`);

    // Transform backend response to match frontend interface
    const clientAccesses = response.data;
    const total = clientAccesses.length;
    const limit = params?.limit || total;

    return {
      success: response.success,
      data: clientAccesses,
      pagination: {
        total,
        page: params?.page || 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get single client access by ID
   */
  async getById(id: number): Promise<ClientAccessResponse> {
    return await api.get(`/client-access/${id}`);
  },

  /**
   * Create new client access
   */
  async create(data: CreateClientAccessData): Promise<ClientAccessResponse> {
    return await api.post('/client-access', data);
  },

  /**
   * Update client access
   */
  async update(id: number, data: UpdateClientAccessData): Promise<ClientAccessResponse> {
    return await api.put(`/client-access/${id}`, data);
  },

  /**
   * Delete client access
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/client-access/${id}`);
  },

  /**
   * Resend activation email
   */
  async resendActivation(id: number): Promise<{ success: boolean; message: string }> {
    return await api.post(`/client-access/${id}/resend-activation`);
  },

  /**
   * Upgrade from QUOTE_ONLY to FULL_CLIENT
   */
  async upgradeToFullClient(id: number, data: UpgradeToFullClientData): Promise<ClientAccessResponse> {
    return await api.post(`/client-access/${id}/upgrade-to-full`, data);
  },

  /**
   * Copy activation link to clipboard
   */
  getActivationLink(token: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/client/activate?token=${token}`;
  },

  /**
   * Generate preview token for admin to view client dashboard
   */
  async generatePreviewToken(id: number): Promise<{ success: boolean; data: { token: string; expiresIn: number } }> {
    return await api.post(`/client-access/${id}/preview-token`);
  },
};
