import { api } from './api'

export interface SystemStats {
  users: { total: number; active: number }
  contacts: { total: number }
  tasks: { total: number; open: number; todayNew: number }
  events: { total: number; upcoming: number }
  tickets: { total: number; open: number; todayNew: number }
  quotes: { total: number; pending: number }
  invoices: { total: number; unpaid: number }
  projects: { total: number; active: number }
  clientAccess: { total: number; active: number }
  transactions: { total: number }
  accessLogs: { total: number; todayLogins: number }
}

export interface AccessLog {
  id: number
  userId: number | null
  username: string | null
  ipAddress: string | null
  userAgent: string | null
  action: string
  status: string
  details: string | null
  createdAt: string
  user: {
    id: number
    username: string
    firstName: string | null
    lastName: string | null
    role: string
  } | null
}

export interface TableInfo {
  table_name: string
  count: bigint | number
}

export interface DatabaseInfo {
  tables: TableInfo[]
  databaseUrl: string
  nodeEnv: string
}

export interface ActivityDay {
  date: string
  day: string
  logins: number
  tasks: number
  tickets: number
  events: number
}

export interface ModuleSetting {
  id: number
  moduleName: string
  isEnabled: boolean
  label: string
  description: string | null
  displayOrder: number
  updatedAt: string
  updatedBy: number | null
}

export const developerAPI = {
  // Get system statistics
  getStats: async (): Promise<SystemStats> => {
    const response = await api.get('/developer/stats')
    return response.data
  },

  // Get recent access logs
  getAccessLogs: async (limit: number = 50, action?: string): Promise<AccessLog[]> => {
    let endpoint = `/developer/access-logs?limit=${limit}`
    if (action) {
      endpoint += `&action=${action}`
    }
    const response = await api.get(endpoint)
    return response.data
  },

  // Get database info
  getDatabaseInfo: async (): Promise<DatabaseInfo> => {
    const response = await api.get('/developer/database')
    return response.data
  },

  // Get activity history (last 7 days)
  getActivityHistory: async (): Promise<ActivityDay[]> => {
    const response = await api.get('/developer/activity-history')
    return response.data
  },

  // Clean old sessions
  cleanSessions: async (): Promise<{ deletedCount: number; message: string }> => {
    const response = await api.post('/developer/clean-sessions')
    return { deletedCount: response.data.deletedCount, message: response.message }
  },

  // Clean old access logs
  cleanAccessLogs: async (): Promise<{ deletedCount: number; message: string }> => {
    const response = await api.post('/developer/clean-logs')
    return { deletedCount: response.data.deletedCount, message: response.message }
  },

  // Get all module settings (DEVELOPER only)
  getModuleSettings: async (): Promise<ModuleSetting[]> => {
    const response = await api.get('/developer/modules')
    return response.data
  },

  // Update module visibility (DEVELOPER only)
  updateModuleSettings: async (moduleName: string, isEnabled: boolean): Promise<ModuleSetting> => {
    const response = await api.put(`/developer/modules/${moduleName}`, { isEnabled })
    return response.data
  },

  // Get enabled modules (all authenticated)
  getEnabledModules: async (): Promise<string[]> => {
    const response = await api.get('/developer/modules/enabled')
    return response.data
  },
}

export default developerAPI
