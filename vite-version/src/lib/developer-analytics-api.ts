const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface AnalyticsTotals {
  paidRevenue: number
  issued: number
  draft: number
  expenses: number
  income: number
  margin: number
  ebitda: number
  taxes: number
  migration: number
  clients: number
  eventHours: number
  taskEstHours: number
}

export interface AnalyticsClient {
  name: string
  revenue: number
  eventHours: number
  taskEstHours: number
  euroPerHour: number | null
}

export interface AnalyticsData {
  totals: AnalyticsTotals
  yearly: { year: number; revenue: number; expenses: number }[]
  monthly: { month: string; revenue: number; expenses: number }[]
  clients: AnalyticsClient[]
  overdue: { client: string; invoiceNumber: string; total: number; dueDate: string; overdueDays: number }[]
  timeByCategory: { category: string; events: number; hours: number }[]
  expenseByCategory: { category: string; count: number; total: number }[]
}

function getToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('client_auth_token')
}

export const developerAnalyticsAPI = {
  async get(): Promise<AnalyticsData> {
    const token = getToken()
    const res = await fetch(`${API_BASE_URL}/developer/analytics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Errore' }))
      throw new Error(err.message || 'Errore')
    }
    const json = await res.json()
    if (!json.success) throw new Error(json.message || 'Errore')
    return json.data
  },
}
