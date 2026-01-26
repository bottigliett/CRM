const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline?: string;
  contactId?: number;
  categoryId?: number;
  assignedTo?: number;
  isArchived: boolean;
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

class ClientTasksAPI {
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

  async getTasks(params: { limit?: number; isArchived?: boolean } = {}): Promise<{
    success: boolean;
    data: Task[];
  }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.isArchived !== undefined) queryParams.append('isArchived', params.isArchived.toString());

    const query = queryParams.toString();
    return this.request<any>(`/client/tasks${query ? `?${query}` : ''}`);
  }

  async getTaskById(id: number): Promise<{
    success: boolean;
    data: Task;
  }> {
    return this.request<any>(`/client/tasks/${id}`);
  }
}

export const clientTasksAPI = new ClientTasksAPI();
