const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Event {
  id: number;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  contactId?: number;
  categoryId?: number;
  assignedTo?: number;
  status: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  contact?: {
    id: number;
    name: string;
    email?: string;
  };
  category?: {
    id: number;
    name: string;
    color?: string;
  };
  assignedUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

class ClientEventsAPI {
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

  async getEvents(params: { limit?: number; startDate?: string; endDate?: string } = {}): Promise<{
    success: boolean;
    data: Event[];
  }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const query = queryParams.toString();
    return this.request<any>(`/client/events${query ? `?${query}` : ''}`);
  }

  async getEventById(id: number): Promise<{
    success: boolean;
    data: Event;
  }> {
    return this.request<any>(`/client/events/${id}`);
  }
}

export const clientEventsAPI = new ClientEventsAPI();
