import clientApi from './client-api'

export interface ClientSystemAnnouncement {
  id: number
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'MAINTENANCE' | 'CRITICAL'
  priority: number
  targetRoles: string | null
  startsAt: string
  endsAt: string | null
  createdAt: string
}

export const clientAnnouncementsAPI = {
  // Get active announcements for client portal
  getActive: async (): Promise<ClientSystemAnnouncement[]> => {
    const response = await clientApi.get('/client/announcements/active')
    return response.data.data
  },
}

export default clientAnnouncementsAPI
