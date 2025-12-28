import { create } from 'zustand';
import { api, type User } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
    selectedTheme?: string | null;
    selectedTweakcnTheme?: string | null;
    selectedRadius?: string | null;
    importedThemeData?: string | null;
    brandColors?: string | null;
    sidebarVariant?: string | null;
    sidebarCollapsible?: string | null;
    sidebarSide?: string | null;
  }) => Promise<void>;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: api.getUser(),
  isAuthenticated: api.isAuthenticated(),
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login({ username, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login fallito',
        isLoading: false
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.register(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message || 'Registrazione fallita',
        isLoading: false
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error) {
      // Anche se il logout fallisce, rimuovi l'utente localmente
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      console.log('[AuthStore] Updating profile with data:', data);
      const updatedUser = await api.updateUser(data);
      console.log('[AuthStore] Profile updated successfully. New user:', updatedUser);
      set({
        user: updatedUser,
        isLoading: false
      });
    } catch (error: any) {
      console.error('[AuthStore] Error updating profile:', error);
      set({
        error: error.message || 'Aggiornamento profilo fallito',
        isLoading: false
      });
      throw error;
    }
  },

  checkAuth: () => {
    const user = api.getUser();
    const isAuthenticated = api.isAuthenticated();
    set({ user, isAuthenticated });
  },

  clearError: () => {
    set({ error: null });
  },
}));
