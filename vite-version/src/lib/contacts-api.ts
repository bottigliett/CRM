const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ContactTag {
  id: number;
  tag: string;
  color: string | null;
}

export interface ContactSocial {
  id: number;
  platform: string;
  url: string;
  username: string | null;
}

export interface ContactCustomField {
  id: number;
  fieldName: string;
  fieldValue: string;
  fieldType: string;
}

export interface Contact {
  id: number;
  name: string;
  type: 'COLLABORATION' | 'USEFUL_CONTACT' | 'PROSPECT' | 'CLIENT';
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
  leadSource: string | null;
  tags: ContactTag[];
  socials: ContactSocial[];
  customFields: ContactCustomField[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactsResponse {
  success: boolean;
  data: {
    contacts: Contact[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface ContactResponse {
  success: boolean;
  data: Contact;
  message?: string;
}

export interface GetContactsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  excludeLeads?: string;
  status?: string;
  tags?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateContactData {
  name: string;
  type?: 'COLLABORATION' | 'USEFUL_CONTACT' | 'PROSPECT' | 'CLIENT';
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  country?: string;
  partitaIva?: string;
  codiceFiscale?: string;
  website?: string;
  notes?: string;
  priority?: number;
  status?: string;
  funnelStage?: string;
  funnelValue?: number;
  leadSource?: string;
  tags?: Array<{ tag: string; color?: string } | string>;
  socials?: Array<{ platform: string; url: string; username?: string }>;
  customFields?: Array<{ fieldName: string; fieldValue: string; fieldType?: string }>;
}

class ContactsAPI {
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

  async getContacts(params: GetContactsParams = {}): Promise<ContactsResponse> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.type) queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);
    if (params.tags) queryParams.append('tags', params.tags);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const url = `${API_BASE_URL}/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero dei contatti');
    }

    return response.json();
  }

  async getContactById(id: number): Promise<ContactResponse> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero del contatto');
    }

    return response.json();
  }

  async createContact(data: CreateContactData): Promise<ContactResponse> {
    const response = await fetch(`${API_BASE_URL}/contacts`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nella creazione del contatto');
    }

    return response.json();
  }

  async updateContact(id: number, data: Partial<CreateContactData>): Promise<ContactResponse> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Errore nell'aggiornamento del contatto");
    }

    return response.json();
  }

  async deleteContact(id: number): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Errore nell'eliminazione del contatto");
    }

    return response.json();
  }

  async getAllTags(): Promise<{ success: boolean; data: Array<{ tag: string; color: string | null }> }> {
    const response = await fetch(`${API_BASE_URL}/contacts/tags/all`, {
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero dei tags');
    }

    return response.json();
  }
}

export const contactsAPI = new ContactsAPI();
