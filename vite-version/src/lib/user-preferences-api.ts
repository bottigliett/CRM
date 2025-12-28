const API_BASE_URL = 'http://localhost:3001/api';

export interface UserPagePreference {
  id: number;
  userId: number;
  pageName: string;
  viewMode?: string;
  pageLimit?: number;
  typeFilter?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavePreferencesData {
  viewMode?: string;
  pageLimit?: number;
  typeFilter?: string;
}

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Get user preferences for a specific page
 */
export async function getUserPreferences(pageName: string): Promise<UserPagePreference | null> {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/user-preferences/${pageName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Errore nel recupero delle preferenze');
    }

    return result.data;
  } catch (error: any) {
    console.error('[getUserPreferences] Error:', error);
    throw error;
  }
}

/**
 * Save or update user preferences for a specific page
 */
export async function saveUserPreferences(
  pageName: string,
  preferences: SavePreferencesData
): Promise<UserPagePreference> {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/user-preferences/${pageName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Errore nel salvataggio delle preferenze');
    }

    return result.data;
  } catch (error: any) {
    console.error('[saveUserPreferences] Error:', error);
    throw error;
  }
}

export const userPreferencesAPI = {
  getUserPreferences,
  saveUserPreferences,
};
