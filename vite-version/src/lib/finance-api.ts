const API_BASE_URL = 'http://localhost:3001/api';

// Transaction types
export type TransactionType = 'INCOME' | 'EXPENSE';

// Transaction Category
export interface TransactionCategory {
  id: number;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

// Payment Method
export interface PaymentMethod {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Transaction
export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  categoryId: number | null;
  paymentMethodId: number | null;
  contactId: number | null;
  invoiceId: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  category?: TransactionCategory;
  paymentMethod?: PaymentMethod;
  contact?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

// API Response types
export interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface TransactionResponse {
  success: boolean;
  data: Transaction;
  message?: string;
}

export interface TransactionCategoriesResponse {
  success: boolean;
  data: TransactionCategory[];
}

export interface TransactionCategoryResponse {
  success: boolean;
  data: TransactionCategory;
  message?: string;
}

export interface PaymentMethodsResponse {
  success: boolean;
  data: PaymentMethod[];
}

export interface PaymentMethodResponse {
  success: boolean;
  data: PaymentMethod;
  message?: string;
}

export interface TransactionStatsResponse {
  success: boolean;
  data: {
    period: {
      start: string;
      end: string;
    } | null;
    summary: {
      income: number;
      expenses: number;
      balance: number;
      incomeChange: number;
      expensesChange: number;
    };
    categoryBreakdown: Array<{
      name: string;
      type: TransactionType;
      color: string | null;
      total: number;
      count: number;
    }>;
    transactionCount: {
      income: number;
      expenses: number;
      total: number;
    };
  };
}

// Query params
export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: number;
  contactId?: number;
  paymentMethodId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetTransactionStatsParams {
  startDate?: string;
  endDate?: string;
  comparePrevious?: boolean;
}

export interface CreateTransactionData {
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
  categoryId?: number;
  paymentMethodId?: number;
  contactId?: number;
  invoiceId?: number;
}

export interface UpdateTransactionData {
  type?: TransactionType;
  amount?: number;
  date?: string;
  description?: string;
  categoryId?: number;
  paymentMethodId?: number;
  contactId?: number;
  invoiceId?: number;
}

export interface CreateTransactionCategoryData {
  name: string;
  type: TransactionType;
  icon?: string;
  color?: string;
}

export interface UpdateTransactionCategoryData {
  name?: string;
  type?: TransactionType;
  icon?: string;
  color?: string;
}

export interface CreatePaymentMethodData {
  name: string;
}

export interface UpdatePaymentMethodData {
  name: string;
}

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Transactions API
export const transactionsAPI = {
  // Get all transactions with filters
  async getTransactions(params?: GetTransactionsParams): Promise<TransactionsResponse> {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${API_BASE_URL}/transactions?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get transaction by ID
  async getTransactionById(id: number): Promise<TransactionResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get transaction statistics
  async getTransactionStats(params?: GetTransactionStatsParams): Promise<TransactionStatsResponse> {
    const token = getAuthToken();
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const url = `${API_BASE_URL}/transactions/stats/summary?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Create new transaction
  async createTransaction(data: CreateTransactionData): Promise<TransactionResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update transaction
  async updateTransaction(id: number, data: UpdateTransactionData): Promise<TransactionResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Delete transaction
  async deleteTransaction(id: number): Promise<{ success: boolean; message: string }> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

// Transaction Categories API
export const transactionCategoriesAPI = {
  // Get all categories
  async getCategories(type?: TransactionType): Promise<TransactionCategoriesResponse> {
    const token = getAuthToken();
    const queryParams = type ? `?type=${type}` : '';
    const response = await fetch(`${API_BASE_URL}/transactions/categories/all${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get category by ID
  async getCategoryById(id: number): Promise<TransactionCategoryResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/categories/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Create new category
  async createCategory(data: CreateTransactionCategoryData): Promise<TransactionCategoryResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update category
  async updateCategory(id: number, data: UpdateTransactionCategoryData): Promise<TransactionCategoryResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Delete category
  async deleteCategory(id: number): Promise<{ success: boolean; message: string }> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/transactions/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

// Payment Methods API
export const paymentMethodsAPI = {
  // Get all payment methods
  async getPaymentMethods(): Promise<PaymentMethodsResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment-methods`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Get payment method by ID
  async getPaymentMethodById(id: number): Promise<PaymentMethodResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment-methods/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Create new payment method
  async createPaymentMethod(data: CreatePaymentMethodData): Promise<PaymentMethodResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment-methods`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Update payment method
  async updatePaymentMethod(id: number, data: UpdatePaymentMethodData): Promise<PaymentMethodResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment-methods/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // Delete payment method
  async deletePaymentMethod(id: number): Promise<{ success: boolean; message: string }> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/payment-methods/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};
