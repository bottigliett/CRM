const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Task {
  id: number;
  title: string;
  description?: string;
  contactId?: number;
  categoryId: number;
  assignedTo: number;
  createdBy: number;
  priority: 'P1' | 'P2' | 'P3';
  status: 'TODO' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED';
  deadline: string;
  estimatedHours?: number;
  actualHours?: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: number;
  visibleToClient: boolean;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: number;
  isFavorite?: boolean;
  contact?: {
    id: number;
    name: string;
    email?: string;
    type?: string;
  };
  category?: TaskCategory;
  assignedUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  creator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface TaskCategory {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
  };
}

export interface GetTasksParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  categoryId?: number;
  contactId?: number;
  assignedTo?: number;
  search?: string;
  isArchived?: boolean;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  contactId?: number;
  categoryId: number;
  assignedTo: number;
  priority?: 'P1' | 'P2' | 'P3';
  status?: 'TODO' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED';
  deadline: string;
  estimatedHours?: number;
  visibleToClient?: boolean;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {
  actualHours?: number;
  completedAt?: string;
  isFavorite?: boolean;
}

export interface CreateTaskCategoryData {
  name: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateTaskCategoryData extends Partial<CreateTaskCategoryData> {}

class TasksAPI {
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

  // Tasks
  async getTasks(params: GetTasksParams = {}): Promise<{
    success: boolean;
    data: {
      tasks: Task[];
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
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
    if (params.contactId) queryParams.append('contactId', params.contactId.toString());
    if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.isArchived !== undefined) queryParams.append('isArchived', params.isArchived.toString());

    const query = queryParams.toString();
    return this.request<any>(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTaskById(id: number): Promise<{
    success: boolean;
    data: Task;
  }> {
    return this.request<any>(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskData): Promise<{
    success: boolean;
    message: string;
    data: Task;
  }> {
    return this.request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: number, data: UpdateTaskData): Promise<{
    success: boolean;
    message: string;
    data: Task;
  }> {
    return this.request<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async archiveTask(id: number): Promise<{
    success: boolean;
    message: string;
    data: Task;
  }> {
    return this.request<any>(`/tasks/${id}/archive`, {
      method: 'POST',
    });
  }

  async toggleFavorite(id: number, isFavorite: boolean): Promise<{
    success: boolean;
    message: string;
    data: Task;
  }> {
    return this.request<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isFavorite }),
    });
  }

  // Task Categories
  async getTaskCategories(includeInactive = false): Promise<{
    success: boolean;
    data: TaskCategory[];
  }> {
    const query = includeInactive ? '?includeInactive=true' : '';
    return this.request<any>(`/tasks/categories/all${query}`);
  }

  async getTaskCategoryById(id: number): Promise<{
    success: boolean;
    data: TaskCategory;
  }> {
    return this.request<any>(`/tasks/categories/${id}`);
  }

  async createTaskCategory(data: CreateTaskCategoryData): Promise<{
    success: boolean;
    message: string;
    data: TaskCategory;
  }> {
    return this.request<any>('/tasks/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTaskCategory(id: number, data: UpdateTaskCategoryData): Promise<{
    success: boolean;
    message: string;
    data: TaskCategory;
  }> {
    return this.request<any>(`/tasks/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTaskCategory(id: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request<any>(`/tasks/categories/${id}`, {
      method: 'DELETE',
    });
  }
}

export const tasksAPI = new TasksAPI();
