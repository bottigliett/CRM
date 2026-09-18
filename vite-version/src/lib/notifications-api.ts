import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface Notification {
  id: number;
  userId: number;
  type: 'EVENT_REMINDER' | 'EVENT_ASSIGNED' | 'TASK_ASSIGNED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE' | 'FORM_SUBMISSION' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  eventId?: number;
  taskId?: number;
  metadata?: string;
  createdAt: string;
}

export interface NotificationPreference {
  id: number;
  userId: number;
  emailEnabled: boolean;
  emailEventReminder: boolean;
  emailEventAssigned: boolean;
  emailTaskAssigned: boolean;
  emailTaskDueSoon: boolean;
  emailTaskOverdue: boolean;
  browserEnabled: boolean;
  browserEventReminder: boolean;
  browserEventAssigned: boolean;
  browserTaskAssigned: boolean;
  browserTaskDueSoon: boolean;
  browserTaskOverdue: boolean;
  centerEnabled: boolean;
  defaultReminderEnabled: boolean;
  defaultReminderType?: 'MINUTES_15' | 'MINUTES_30' | 'HOUR_1' | 'DAY_1';
  createdAt: string;
  updatedAt: string;
}

const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const notificationsAPI = {
  // Get notifications
  async getNotifications(unreadOnly: boolean = false) {
    const response = await axios.get(`${API_BASE_URL}/notifications`, {
      params: { unreadOnly },
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Mark notification as read
  async markAsRead(notificationId: number) {
    const response = await axios.patch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {},
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await axios.patch(
      `${API_BASE_URL}/notifications/read-all`,
      {},
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Delete notification
  async deleteNotification(notificationId: number) {
    const response = await axios.delete(
      `${API_BASE_URL}/notifications/${notificationId}`,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  // Get notification preferences
  async getPreferences() {
    const response = await axios.get(`${API_BASE_URL}/notifications/preferences`, {
      headers: getAuthHeader(),
    });
    return response.data;
  },

  // Update notification preferences
  async updatePreferences(preferences: Partial<NotificationPreference>) {
    const response = await axios.put(
      `${API_BASE_URL}/notifications/preferences`,
      preferences,
      { headers: getAuthHeader() }
    );
    return response.data;
  },
};
