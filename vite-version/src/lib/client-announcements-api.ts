const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

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

class ClientAnnouncementsAPI {
  private getAuthToken(): string | null {
    // Check for preview token first (sessionStorage)
    const previewToken = sessionStorage.getItem('client_preview_token')
    if (previewToken) {
      return previewToken
    }
    // Fallback to regular auth token (localStorage)
    return localStorage.getItem('client_auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken()

    if (!token) {
      throw new Error('Token non fornito')
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'An error occurred')
    }

    return response.json()
  }

  async getActive(): Promise<ClientSystemAnnouncement[]> {
    const response = await this.request<{ success: boolean; data: ClientSystemAnnouncement[] }>(
      '/client/announcements/active'
    )
    return response.data
  }
}

export const clientAnnouncementsAPI = new ClientAnnouncementsAPI()
export default clientAnnouncementsAPI
