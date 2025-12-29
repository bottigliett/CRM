const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Lead {
  id: number;
  name: string;
  type: 'LEAD' | 'PROSPECT' | 'CLIENT' | 'COMPANY' | 'PERSON';
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  country: string | null;
  partitaIva: string | null;
  codiceFiscale: string | null;
  website: string | null;
  notes: string | null;
  priority: number | null;
  status: string | null;
  funnelStage: string | null;
  funnelValue: number | null;
  funnelPosition: number | null;
  leadSource: string | null;
  serviceType: string | null;
  contactDate: string | null;
  linkedContactId: number | null;
  tags: Array<{ id: number; tag: string; color: string | null }>;
  socials: Array<{ id: number; platform: string; url: string; username: string | null }>;
  customFields: Array<{ id: number; fieldName: string; fieldValue: string; fieldType: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStage {
  id: number;
  name: string;
  order: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsResponse {
  success: boolean;
  data: {
    leads: Record<string, Lead[]>;
    totals: Record<string, number>;
    stages: FunnelStage[];
  };
}

export interface LeadResponse {
  success: boolean;
  data: Lead;
  message?: string;
}

export interface FunnelStagesResponse {
  success: boolean;
  data: FunnelStage[];
}

export interface CreateQuickLeadData {
  name: string;
  email?: string;
  phone?: string;
  funnelStage?: string;
  funnelValue?: number;
  leadSource?: string;
  serviceType?: string;
  contactDate?: string;
  linkedContactId?: number;
}

export interface UpdateLeadData {
  name?: string;
  email?: string;
  phone?: string;
  funnelValue?: number;
  leadSource?: string;
  serviceType?: string;
  contactDate?: string;
  linkedContactId?: number;
}

export interface MoveLeadData {
  funnelStage: string;
  funnelPosition?: number;
}

class LeadsAPI {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Non autenticato');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getLeads(): Promise<LeadsResponse> {
    const response = await fetch(`${API_BASE_URL}/leads`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero dei lead');
    }

    return response.json();
  }

  async moveLead(id: number, data: MoveLeadData): Promise<LeadResponse> {
    const response = await fetch(`${API_BASE_URL}/leads/${id}/move`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nello spostamento del lead');
    }

    return response.json();
  }

  async getFunnelStages(): Promise<FunnelStagesResponse> {
    const response = await fetch(`${API_BASE_URL}/leads/stages`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero degli stage');
    }

    return response.json();
  }

  async createQuickLead(data: CreateQuickLeadData): Promise<LeadResponse> {
    const response = await fetch(`${API_BASE_URL}/leads/quick`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nella creazione del lead');
    }

    return response.json();
  }

  async updateLead(id: number, data: UpdateLeadData): Promise<LeadResponse> {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nell\'aggiornamento del lead');
    }

    return response.json();
  }

  async deleteLead(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nell\'eliminazione del lead');
    }

    return response.json();
  }
}

export const leadsAPI = new LeadsAPI();
