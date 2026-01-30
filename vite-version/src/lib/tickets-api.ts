import { api } from './api';

export interface Contact {
  id: number;
  name: string;
  email: string | null;
}

export interface ClientAccess {
  id: number;
  username: string;
  projectName: string | null;
  contact: Contact;
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
  userId: number | null;
  clientAccessId: number | null;
  message: string;
  isInternal: boolean;
  clientReadAt: string | null;
  createdAt: string;
  attachments?: TicketAttachment[];
}

export interface TicketActivityLog {
  id: number;
  ticketId: number;
  userId: number | null;
  clientAccessId: number | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  details: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  clientAccessId: number;
  contactId: number;
  supportType: 'TECHNICAL' | 'DESIGN' | 'CONTENT' | 'BILLING' | 'OTHER';
  subject: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  assignedTo: number | null;
  timeSpentMinutes: number;
  closingNotes: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientAccess: ClientAccess;
  contact: Contact;
  messages: TicketMessage[];
  activityLogs: TicketActivityLog[];
  attachments?: TicketAttachment[];
}

export interface CreateTicketData {
  clientAccessId: number;
  contactId: number;
  supportType: 'TECHNICAL' | 'DESIGN' | 'CONTENT' | 'BILLING' | 'OTHER';
  subject: string;
  description: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: number;
}

export interface UpdateTicketData extends Partial<CreateTicketData> {
  status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  timeSpentMinutes?: number;
  closingNotes?: string;
}

export interface CreateTicketMessageData {
  message: string;
  isInternal?: boolean;
}

export interface TicketListResponse {
  success: boolean;
  data: Ticket[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface TicketResponse {
  success: boolean;
  data: Ticket;
  message?: string;
}

export interface TicketMessageResponse {
  success: boolean;
  data: TicketMessage;
  message?: string;
}

export const ticketsAPI = {
  /**
   * Get all tickets with filters
   */
  async getAll(params?: {
    search?: string;
    status?: string;
    priority?: string;
    supportType?: string;
    assignedTo?: number;
    clientAccessId?: number;
    page?: number;
    limit?: number;
  }): Promise<TicketListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.supportType) queryParams.append('supportType', params.supportType);
    if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo.toString());
    if (params?.clientAccessId) queryParams.append('clientAccessId', params.clientAccessId.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(`/tickets?${queryParams.toString()}`);

    // Transform backend response to match frontend interface
    const tickets = response.data;
    const total = tickets.length;
    const limit = params?.limit || total;

    return {
      success: response.success,
      data: tickets,
      pagination: {
        total,
        page: params?.page || 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get single ticket by ID
   */
  async getById(id: number): Promise<TicketResponse> {
    return await api.get(`/tickets/${id}`);
  },

  /**
   * Create new ticket
   */
  async create(data: CreateTicketData): Promise<TicketResponse> {
    return await api.post('/tickets', data);
  },

  /**
   * Update ticket
   */
  async update(id: number, data: UpdateTicketData): Promise<TicketResponse> {
    return await api.put(`/tickets/${id}`, data);
  },

  /**
   * Delete ticket
   */
  async delete(id: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/tickets/${id}`);
  },

  /**
   * Add message to ticket
   */
  async addMessage(ticketId: number, data: CreateTicketMessageData): Promise<TicketMessageResponse> {
    return await api.post(`/tickets/${ticketId}/messages`, data);
  },

  /**
   * Log time spent on ticket
   */
  async logTime(ticketId: number, minutes: number): Promise<TicketResponse> {
    return await api.post(`/tickets/${ticketId}/log-time`, { minutes });
  },

  /**
   * Assign ticket to user
   */
  async assign(ticketId: number, userId: number): Promise<TicketResponse> {
    const response = await api.post(`/tickets/${ticketId}/assign`, { userId });
    return response.data;
  },

  /**
   * Close ticket
   */
  async close(ticketId: number, closingNotes?: string): Promise<TicketResponse> {
    const response = await api.post(`/tickets/${ticketId}/close`, { closingNotes });
    return response.data;
  },

  /**
   * Reopen ticket
   */
  async reopen(ticketId: number): Promise<TicketResponse> {
    const response = await api.post(`/tickets/${ticketId}/reopen`);
    return response.data;
  },

  /**
   * Upload attachments to ticket
   */
  async uploadAttachments(
    ticketId: number,
    files: File[],
    isInternal: boolean = false,
    ticketMessageId?: number
  ): Promise<{ success: boolean; data: TicketAttachment[]; message: string }> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    formData.append('isInternal', isInternal.toString());

    if (ticketMessageId) {
      formData.append('ticketMessageId', ticketMessageId.toString());
    }

    return await api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get download URL for attachment
   */
  downloadAttachment(attachmentId: number): string {
    const token = localStorage.getItem('auth_token');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return `${baseURL}/tickets/attachments/${attachmentId}?token=${token}`;
  },

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: number): Promise<{ success: boolean; message: string }> {
    return await api.delete(`/tickets/attachments/${attachmentId}`);
  },

  /**
   * Format time spent in hours and minutes
   */
  formatTimeSpent(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  },
};
