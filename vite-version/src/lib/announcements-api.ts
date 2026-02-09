import { api } from './api'

export interface SystemAnnouncement {
  id: number
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'CRITICAL'
  priority: number
  targetRoles: string | null
  startsAt: string
  endsAt: string | null
  isActive: boolean
  createdById: number
  createdBy: {
    id: number
    username: string
    firstName: string | null
    lastName: string | null
  }
  createdAt: string
  updatedAt: string
}

export interface CreateAnnouncementData {
  title: string
  message: string
  type?: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'CRITICAL'
  priority?: number
  targetRoles?: string[] | null
  startsAt?: string
  endsAt?: string | null
}

export interface UpdateAnnouncementData extends Partial<CreateAnnouncementData> {
  isActive?: boolean
}

export const announcementsAPI = {
  // Get active announcements for current user
  getActive: async (): Promise<SystemAnnouncement[]> => {
    try {
      const response = await api.get('/announcements/active')
      return response?.data || []
    } catch (error) {
      console.error('Failed to get active announcements:', error)
      return []
    }
  },

  // Get all announcements (admin/developer only)
  getAll: async (): Promise<SystemAnnouncement[]> => {
    const response = await api.get('/announcements')
    return response?.data || []
  },

  // Create announcement (admin/developer only)
  create: async (data: CreateAnnouncementData): Promise<SystemAnnouncement> => {
    const response = await api.post('/announcements', data)
    return response.data
  },

  // Update announcement (admin/developer only)
  update: async (id: number, data: UpdateAnnouncementData): Promise<SystemAnnouncement> => {
    const response = await api.put(`/announcements/${id}`, data)
    return response.data
  },

  // Delete announcement (admin/developer only)
  delete: async (id: number): Promise<void> => {
    await api.delete(`/announcements/${id}`)
  },
}

export default announcementsAPI
