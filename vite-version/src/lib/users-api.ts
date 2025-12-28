const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

export interface CalendarPreferences {
  defaultView?: string;
  defaultStartHour?: number;
  defaultEndHour?: number;
  favoriteCategories?: number[];
  showWeekends?: boolean;
  defaultEventDuration?: number;
  hideSidebar?: boolean;
}

class UsersAPI {
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

  async getAdminUsers(): Promise<{
    success: boolean;
    data: {
      users: User[];
    };
  }> {
    return this.request<any>('/api/users/admins');
  }

  async getCalendarPreferences(): Promise<{
    success: boolean;
    data: CalendarPreferences;
  }> {
    return this.request<any>('/api/users/calendar-preferences');
  }

  async updateCalendarPreferences(preferences: CalendarPreferences): Promise<{
    success: boolean;
    data: CalendarPreferences;
  }> {
    return this.request<any>('/api/users/calendar-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }
}

export const usersAPI = new UsersAPI();
