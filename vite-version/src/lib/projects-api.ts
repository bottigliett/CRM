const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ProjectMetrics {
  actualHours: number;
  estimatedHoursFromTasks: number;
  hourlyRate: number;
  isUnderThreshold: boolean;
}

export interface TimeBreakdown {
  period: string;
  hours: number;
  events: number;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  contactId: number;
  budget: number;
  estimatedHours?: number;
  status: 'ACTIVE' | 'COMPLETED';
  startDate: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  contact?: {
    id: number;
    name: string;
    type?: string;
  };
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  metrics?: ProjectMetrics;
}

export interface ProjectDetail extends Project {
  breakdowns?: {
    weekly: TimeBreakdown[];
    monthly: TimeBreakdown[];
  };
  events?: Array<{
    id: number;
    title: string;
    startDateTime: string;
    endDateTime: string;
    category?: {
      name: string;
      color: string;
    };
  }>;
  tasks?: Array<{
    id: number;
    title: string;
    status: string;
    estimatedHours?: number;
    actualHours?: number;
    deadline: string;
  }>;
}

export interface GetProjectsParams {
  status?: 'ACTIVE' | 'COMPLETED';
  contactId?: number;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  contactId: number;
  budget: number;
  estimatedHours?: number;
  startDate?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  budget?: number;
  estimatedHours?: number;
  startDate?: string;
}

class ProjectsAPI {
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

  async getProjects(params: GetProjectsParams = {}): Promise<{
    success: boolean;
    data: Project[];
  }> {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.contactId) queryParams.append('contactId', params.contactId.toString());

    const query = queryParams.toString();
    return this.request<any>(`/projects${query ? `?${query}` : ''}`);
  }

  async getProjectById(id: number): Promise<{
    success: boolean;
    data: ProjectDetail;
  }> {
    return this.request<any>(`/projects/${id}`);
  }

  async createProject(data: CreateProjectData): Promise<{
    success: boolean;
    message: string;
    data: Project;
  }> {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: number, data: UpdateProjectData): Promise<{
    success: boolean;
    message: string;
    data: Project;
  }> {
    return this.request<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async completeProject(id: number): Promise<{
    success: boolean;
    message: string;
    data: Project;
  }> {
    return this.request<any>(`/projects/${id}/complete`, {
      method: 'POST',
    });
  }

  async deleteProject(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }
}

export const projectsAPI = new ProjectsAPI();
