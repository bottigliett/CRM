const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface UserPermission {
  id: number;
  moduleName: string;
  hasAccess: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  emailVerified?: boolean;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  profileImage: string | null;
  lastLogin: string | null;
  theme?: string | null;
  language?: string | null;
  // Theme customizer settings
  selectedTheme?: string | null;
  selectedTweakcnTheme?: string | null;
  selectedRadius?: string | null;
  importedThemeData?: string | null; // JSON string
  brandColors?: string | null; // JSON string
  // Sidebar settings
  sidebarVariant?: string | null;
  sidebarCollapsible?: string | null;
  sidebarSide?: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: UserPermission[];
}

interface AuthResponse {
  user: User;
  token: string;
}

class ApiService {
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async login(credentials: LoginRequest): Promise<AuthResponse & { type?: 'ADMIN' | 'CLIENT' }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data: any = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Login failed');
    }

    const userType = data.type; // 'ADMIN' or 'CLIENT'

    // ADMIN login
    if (userType === 'ADMIN') {
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('user_type', 'ADMIN');

      return {
        ...data.data,
        type: 'ADMIN'
      };
    }

    // CLIENT login - redirect to client portal
    if (userType === 'CLIENT') {
      // Store CLIENT token separately to prevent access to admin area
      localStorage.setItem('client_auth_token', data.data.token);
      localStorage.setItem('client_user', JSON.stringify(data.data.clientAccess));
      localStorage.setItem('user_type', 'CLIENT');

      // Redirect to client area immediately
      window.location.href = '/client/dashboard';

      // Throw to prevent admin dashboard access
      throw new Error('REDIRECT_TO_CLIENT');
    }

    throw new Error('Tipo di utente non riconosciuto');
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data: ApiResponse<AuthResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Registration failed');
    }

    // Salva token
    localStorage.setItem('auth_token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));

    return data.data;
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeader(),
        },
      });
    } finally {
      // Rimuovi sempre token e user
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const data: ApiResponse<{ user: User }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to get user');
    }

    return data.data.user;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async updateUser(userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
    theme?: string;
    language?: string;
    selectedTheme?: string | null;
    selectedTweakcnTheme?: string | null;
    selectedRadius?: string | null;
    importedThemeData?: string | null;
    brandColors?: string | null;
    sidebarVariant?: string | null;
    sidebarCollapsible?: string | null;
    sidebarSide?: string | null;
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(userData),
    });

    const data: ApiResponse<{ user: User }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to update user');
    }

    // Aggiorna l'utente in localStorage
    localStorage.setItem('user', JSON.stringify(data.data.user));

    return data.data.user;
  }

  // User Management (SUPER_ADMIN only)
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const data: ApiResponse<{ users: User[] }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to get users');
    }

    return data.data.users;
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role: string;
    permissions?: Array<{
      moduleName: string;
      hasAccess: boolean;
    }>;
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(userData),
    });

    const data: ApiResponse<{ user: User }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to create user');
    }

    return data.data.user;
  }

  async updateUserById(userId: number, userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    isActive?: boolean;
    role?: string;
    permissions?: Array<{
      moduleName: string;
      hasAccess: boolean;
    }>;
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(userData),
    });

    const data: ApiResponse<{ user: User }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to update user');
    }

    return data.data.user;
  }

  async deleteUserById(userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to delete user');
    }
  }

  async getAvailableModules(): Promise<Array<{
    name: string;
    label: string;
    description: string;
  }>> {
    const response = await fetch(`${API_BASE_URL}/modules`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const data: ApiResponse<{ modules: Array<{
      name: string;
      label: string;
      description: string;
    }> }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to get modules');
    }

    return data.data.modules;
  }

  // Generic HTTP methods for API calls
  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  async post(endpoint: string, data?: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  async put(endpoint: string, data?: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  async patch(endpoint: string, data?: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP Error ${response.status}`);
    }

    return response.json();
  }

  async delete(endpoint: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP Error ${response.status}`);
    }

    return response.json();
  }
}

export const api = new ApiService();
export type { User, AuthResponse, LoginRequest, RegisterRequest };
