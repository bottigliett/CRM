const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('client_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  if (!res.ok) { const e = await res.json().catch(() => ({ message: 'Errore' })); throw new Error(e.message || 'Errore'); }
  return res.json();
}

class PersonalRecurringAPI {
  async getAll() { const r = await request<{ success: boolean; data: any[] }>('/developer/personal/recurring'); return { success: true, data: r.data }; }
  async create(data: any) { return request('/developer/personal/recurring', { method: 'POST', body: JSON.stringify(data) }); }
  async update(id: number, data: any) { return request(`/developer/personal/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  async delete(id: number) { return request(`/developer/personal/recurring/${id}`, { method: 'DELETE' }); }
  async generateMonthly() { return { success: true, data: [] as any[] }; }
  async getGenerationStatus() { return { success: true, data: [] as any[] }; }
}

export const recurringInvoicesAPI = new PersonalRecurringAPI();
export type RecurringInvoice = any;
export type CreateRecurringInvoiceData = any;
export type UpdateRecurringInvoiceData = any;
export type GenerationStatus = any;
