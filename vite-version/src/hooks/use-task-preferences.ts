import { useState, useEffect } from 'react'

type ViewMode = 'list' | 'kanban'

interface TaskPreferences {
  viewMode: ViewMode
  selectedUserId: number | null
}

const STORAGE_KEY = 'task-preferences'

export function useTaskPreferences() {
  const [preferences, setPreferences] = useState<TaskPreferences>({
    viewMode: 'list',
    selectedUserId: null,
  })

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as TaskPreferences
        setPreferences(parsed)
      }
    } catch (error) {
      console.error('Error loading task preferences:', error)
    }
  }, [])

  // Save preferences to localStorage whenever they change
  const updatePreferences = (updates: Partial<TaskPreferences>) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs))
      } catch (error) {
        console.error('Error saving task preferences:', error)
      }
      return newPrefs
    })
  }

  return {
    preferences,
    updatePreferences,
    setViewMode: (viewMode: ViewMode) => updatePreferences({ viewMode }),
    setSelectedUserId: (userId: number | null) => updatePreferences({ selectedUserId: userId }),
  }
}
