const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Ticket {
  id: number;
  ticketNumber: string;
  clientAccessId: number;
  contactId?: number;
  supportType: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assignedTo?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
  _count?: {
    messages: number;
  };
}

export interface TicketAttachment {
  id: number;
  ticketId: number;
  ticketMessageId: number | null;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  isInternal: boolean;
  uploadedBy: string;
  uploadedById: number;
  uploadedAt: string;
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  isClientMessage: boolean;
  message: string;
  createdAt: string;
  attachments?: TicketAttachment[];
}

export interface CreateTicketData {
  supportType: string;
  subject: string;
  description: string;
  priority?: string;
}

class ClientTicketsAPI {
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

  async getAll(params: { limit?: number; status?: string } = {}): Promise<{
    success: boolean;
    data: Ticket[];
    pagination?: any;
  }> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    return this.request<any>(`/client/tickets${query ? `?${query}` : ''}`);
  }

  async getById(id: number): Promise<{
    success: boolean;
    data: Ticket;
  }> {
    return this.request<any>(`/client/tickets/${id}`);
  }

  async create(data: CreateTicketData): Promise<{
    success: boolean;
    message: string;
    data: Ticket;
  }> {
    return this.request<any>('/client/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addMessage(ticketId: number, message: string): Promise<{
    success: boolean;
    message: string;
    data: TicketMessage;
  }> {
    return this.request<any>(`/client/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async uploadAttachments(
    ticketId: number,
    files: File[],
    ticketMessageId?: number
  ): Promise<{
    success: boolean;
    data: TicketAttachment[];
    message: string;
  }> {
    const token = this.getAuthToken();

    if (!token) {
      throw new Error('Token non fornito');
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (ticketMessageId) {
      formData.append('ticketMessageId', ticketMessageId.toString());
    }

    const response = await fetch(
      `${API_BASE_URL}/client/attachments/ticket/${ticketId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel caricamento degli allegati');
    }

    return response.json();
  }

  getPreviewUrl(attachmentId: number): string {
    const token = this.getAuthToken();
    return `${API_BASE_URL}/client/attachments/${attachmentId}?token=${token}`;
  }

  downloadAttachment(attachmentId: number): string {
    const token = this.getAuthToken();
    return `${API_BASE_URL}/client/attachments/${attachmentId}?token=${token}&download=true`;
  }
}

export const clientTicketsAPI = new ClientTicketsAPI();
