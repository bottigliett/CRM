import { create } from 'zustand'
import { developerAPI, type ModuleSetting } from '@/lib/developer-api'

interface ModuleSettingsState {
  modules: ModuleSetting[]
  enabledModules: string[]
  isLoading: boolean
  error: string | null

  fetchModules: () => Promise<void>
  fetchEnabledModules: () => Promise<void>
  toggleModule: (moduleName: string, isEnabled: boolean) => Promise<void>
  isModuleEnabled: (moduleName: string) => boolean
}

export const useModuleSettingsStore = create<ModuleSettingsState>((set, get) => ({
  modules: [],
  enabledModules: [],
  isLoading: false,
  error: null,

  // Fetch all modules (DEVELOPER only)
  fetchModules: async () => {
    set({ isLoading: true, error: null })
    try {
      const modules = await developerAPI.getModuleSettings()
      set({ modules, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  // Fetch enabled modules (all authenticated users)
  fetchEnabledModules: async () => {
    try {
      const enabledModules = await developerAPI.getEnabledModules()
      set({ enabledModules })
    } catch (error: any) {
      console.error('Error fetching enabled modules:', error)
      // On error, assume all modules are enabled (graceful degradation)
      set({ enabledModules: [] })
    }
  },

  // Toggle module visibility (DEVELOPER only)
  toggleModule: async (moduleName: string, isEnabled: boolean) => {
    try {
      await developerAPI.updateModuleSettings(moduleName, isEnabled)
      // Update local state
      set(state => ({
        modules: state.modules.map(m =>
          m.moduleName === moduleName ? { ...m, isEnabled } : m
        ),
        enabledModules: isEnabled
          ? [...state.enabledModules, moduleName]
          : state.enabledModules.filter(m => m !== moduleName)
      }))
    } catch (error: any) {
      throw error
    }
  },

  // Check if a module is enabled
  isModuleEnabled: (moduleName: string) => {
    const { enabledModules } = get()
    // If enabledModules is empty (not loaded yet), assume all are enabled
    if (enabledModules.length === 0) return true
    return enabledModules.includes(moduleName)
  },
}))
