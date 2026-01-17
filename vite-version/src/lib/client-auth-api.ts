const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface ClientAccess {
  id: number;
  contactId: number;
  accessType: 'QUOTE_ONLY' | 'FULL_CLIENT';
  username: string;
  emailVerified: boolean;
  isActive: boolean;
  projectName: string | null;
  projectDescription: string | null;
  monthlyFee: number;
  supportHoursIncluded: number;
  supportHoursUsed: number;
  linkedQuoteId: number | null;
  contact: {
    id: number;
    name: string;
    email: string | null;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  data: {
    clientAccess: ClientAccess;
    email: string;
  };
  message?: string;
}

export interface SendVerificationCodeResponse {
  success: boolean;
  message: string;
}

export interface VerifyCodeResponse {
  success: boolean;
  message: string;
}

export interface CompleteActivationResponse {
  success: boolean;
  data: {
    clientAccess: ClientAccess;
    token: string;
  };
  message: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    clientAccess: ClientAccess;
    token: string;
  };
  message?: string;
}

export interface ClientMeResponse {
  success: boolean;
  data: ClientAccess;
}

class ClientAuthAPI {
  /**
   * Step 1: Verify activation token
   */
  async verifyToken(token: string): Promise<VerifyTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/client-auth/verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nella verifica del token');
    }

    return response.json();
  }

  /**
   * Step 2: Send verification code to email
   */
  async sendVerificationCode(token: string, email: string): Promise<SendVerificationCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/client-auth/send-verification-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Errore nell'invio del codice");
    }

    return response.json();
  }

  /**
   * Step 2.5: Verify email code
   */
  async verifyCode(token: string, code: string): Promise<VerifyCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/client-auth/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, code }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nella verifica del codice');
    }

    return response.json();
  }

  /**
   * Manual Flow Step 1: Verify username exists and is not activated
   */
  async verifyUsername(username: string): Promise<VerifyTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/activate/verify-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Username non trovato o già attivato');
    }

    return response.json();
  }

  /**
   * Manual Flow Step 2a: Send activation code via email
   */
  async sendActivationCode(username: string, email: string): Promise<SendVerificationCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/activate/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Errore nell'invio del codice");
    }

    return response.json();
  }

  /**
   * Manual Flow Step 2b: Verify activation code
   */
  async verifyActivationCode(username: string, activationCode: string): Promise<VerifyCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/activate/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, activationCode }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Codice di attivazione non valido');
    }

    return response.json();
  }

  /**
   * Manual Flow Step 3: Complete manual activation with password
   */
  async completeManualActivation(
    username: string,
    activationCode: string,
    password: string
  ): Promise<CompleteActivationResponse> {
    const response = await fetch(`${API_BASE_URL}/activate/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, activationCode, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Errore nel completamento dell'attivazione");
    }

    return response.json();
  }

  /**
   * Step 3: Complete activation with username and password (Token flow)
   */
  async completeActivation(
    token: string,
    username: string,
    password: string
  ): Promise<CompleteActivationResponse> {
    const response = await fetch(`${API_BASE_URL}/client-auth/complete-activation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Errore nel completamento dell'attivazione");
    }

    return response.json();
  }

  /**
   * Client login
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    // Use activate endpoint for login (public route)
    const response = await fetch(`${API_BASE_URL}/activate/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Credenziali non valide');
    }

    const data = await response.json();

    // Store token in localStorage
    if (data.success && data.data.token) {
      localStorage.setItem('client_auth_token', data.data.token);
    }

    return data;
  }

  /**
   * Get authenticated client data
   */
  async getMe(): Promise<ClientMeResponse> {
    const token = localStorage.getItem('client_auth_token');
    if (!token) {
      throw new Error('Non autenticato');
    }

    const response = await fetch(`${API_BASE_URL}/client-auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel recupero dei dati');
    }

    return response.json();
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('client_auth_token');
    if (!token) {
      throw new Error('Non autenticato');
    }

    const response = await fetch(`${API_BASE_URL}/client-auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Errore nel cambio password');
    }

    return response.json();
  }

  /**
   * Logout client
   */
  logout(): void {
    localStorage.removeItem('client_auth_token');
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('client_auth_token');
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('client_auth_token');
  }
}

export const clientAuthAPI = new ClientAuthAPI();
