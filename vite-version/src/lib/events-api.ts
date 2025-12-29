const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Event {
  id: number;
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  categoryId?: number;
  contactId?: number;
  location?: string;
  notes?: string;
  status?: string;
  color?: string;
  isAllDay?: boolean;
  visibleToClient?: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  category?: EventCategory;
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    type?: string;
  };
  participants?: EventParticipant[];
}

export interface EventCategory {
  id: number;
  name: string;
  color: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    events: number;
  };
}

export interface EventParticipant {
  id: number;
  eventId: number;
  contactId: number;
  status: string;
  notes?: string;
  createdAt: string;
  contact: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
}

export interface GetEventsParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  contactId?: number;
  status?: string;
  search?: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  categoryId?: number;
  contactId?: number;
  location?: string;
  notes?: string;
  status?: string;
  color?: string;
  isAllDay?: boolean;
  visibleToClient?: boolean;
  assignedTo?: number;
  participants?: {
    contactId: number;
    status?: string;
    notes?: string;
  }[];
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface CreateEventCategoryData {
  name: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateEventCategoryData extends Partial<CreateEventCategoryData> {}

class EventsAPI {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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

  // Events
  async getEvents(params: GetEventsParams = {}): Promise<{
    success: boolean;
    data: {
      events: Event[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params.contactId) queryParams.append('contactId', params.contactId.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<any>(`/events${query ? `?${query}` : ''}`);
  }

  async getEventById(id: number): Promise<{
    success: boolean;
    data: Event;
  }> {
    return this.request<any>(`/events/${id}`);
  }

  async createEvent(data: CreateEventData): Promise<{
    success: boolean;
    message: string;
    data: Event;
  }> {
    return this.request<any>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: number, data: UpdateEventData): Promise<{
    success: boolean;
    message: string;
    data: Event;
  }> {
    return this.request<any>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Event Categories
  async getEventCategories(includeInactive = false): Promise<{
    success: boolean;
    data: EventCategory[];
  }> {
    const query = includeInactive ? '?includeInactive=true' : '';
    return this.request<any>(`/events/categories/all${query}`);
  }

  async getEventCategoryById(id: number): Promise<{
    success: boolean;
    data: EventCategory;
  }> {
    return this.request<any>(`/events/categories/${id}`);
  }

  async createEventCategory(data: CreateEventCategoryData): Promise<{
    success: boolean;
    message: string;
    data: EventCategory;
  }> {
    return this.request<any>('/events/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEventCategory(id: number, data: UpdateEventCategoryData): Promise<{
    success: boolean;
    message: string;
    data: EventCategory;
  }> {
    return this.request<any>(`/events/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEventCategory(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/events/categories/${id}`, {
      method: 'DELETE',
    });
  }
}

export const eventsAPI = new EventsAPI();
