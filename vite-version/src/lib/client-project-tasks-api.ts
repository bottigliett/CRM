const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ClientProjectTask {
  id: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  order: number;
}

export interface ProjectProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface ClientProjectTasksResponse {
  success: boolean;
  data: {
    quote: {
      id: number;
      quoteNumber: string;
      title: string;
    } | null;
    tasks: ClientProjectTask[];
    progress: ProjectProgress;
  };
}

class ClientProjectTasksAPI {
  private getAuthToken(): string | null {
    // Check for preview token first (sessionStorage)
    const previewToken = sessionStorage.getItem('client_preview_token');
    if (previewToken) {
      return previewToken;
    }
    // Fallback to regular auth token (localStorage)
    return localStorage.getItem('client_auth_token');
  }

  async getProjectTasks(): Promise<ClientProjectTasksResponse> {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Token non fornito');
    }

    const response = await fetch(`${API_BASE_URL}/client/project-tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero dei task');
    }

    return response.json();
  }
}

export const clientProjectTasksAPI = new ClientProjectTasksAPI();
