"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/auth-store"
import { useThemeManager } from "@/hooks/use-theme-manager"
import { useSidebarConfig } from "@/contexts/sidebar-context"
import { tweakcnThemes } from "@/config/theme-data"
import type { ImportedTheme } from "@/types/theme-customizer"

/**
 * Component that loads and applies user's saved theme settings
 * Should be mounted once in the app root
 */
export function ThemeSettingsLoader() {
  const { user } = useAuthStore()
  const { applyImportedTheme, applyTheme, applyTweakcnTheme, applyRadius, setBrandColorsValues, isDarkMode, setTheme } = useThemeManager()
  const { updateConfig: updateSidebarConfig } = useSidebarConfig()

  console.log('🔄 ThemeSettingsLoader MOUNTED - user:', user?.username, 'theme:', user?.selectedTheme)

  // Load settings when user logs in or user data changes
  useEffect(() => {
    if (!user) {
      console.log('[ThemeSettingsLoader] No user, skipping theme application')
      return
    }

    // Apply theme mode (light/dark/system) from database
    if (user.theme) {
      console.log('[ThemeSettingsLoader] Applying theme mode from database:', user.theme)
      setTheme(user.theme as "light" | "dark" | "system")
    }

    console.log('[ThemeSettingsLoader] Applying theme settings for user:', user.username)
    console.log('[ThemeSettingsLoader] User theme data:', {
      selectedTheme: user.selectedTheme,
      selectedTweakcnTheme: user.selectedTweakcnTheme,
      selectedRadius: user.selectedRadius,
      hasImportedTheme: !!user.importedThemeData,
      isDarkMode
    })

    // Apply radius
    if (user.selectedRadius) {
      applyRadius(user.selectedRadius)
    }

    // Apply brand colors if exists
    if (user.brandColors) {
      try {
        const parsed = JSON.parse(user.brandColors)
        setBrandColorsValues(parsed)
      } catch (e) {
        console.error('[ThemeSettingsLoader] Error parsing brand colors:', e)
      }
    }

    // Apply sidebar settings
    if (user.sidebarVariant || user.sidebarCollapsible || user.sidebarSide) {
      updateSidebarConfig({
        variant: (user.sidebarVariant as any) || "inset",
        collapsible: (user.sidebarCollapsible as any) || "offcanvas",
        side: (user.sidebarSide as any) || "left",
      })
    }

    // Apply theme (priority: imported > selected > tweakcn)
    if (user.importedThemeData) {
      try {
        const importedTheme: ImportedTheme = JSON.parse(user.importedThemeData)
        console.log('[ThemeSettingsLoader] Applying imported theme')
        applyImportedTheme(importedTheme, isDarkMode)
      } catch (e) {
        console.error('[ThemeSettingsLoader] Error parsing imported theme:', e)
      }
    } else if (user.selectedTheme) {
      console.log('[ThemeSettingsLoader] Applying selected theme:', user.selectedTheme)
      applyTheme(user.selectedTheme, isDarkMode)
    } else if (user.selectedTweakcnTheme) {
      const selectedPreset = tweakcnThemes.find(t => t.value === user.selectedTweakcnTheme)?.preset
      if (selectedPreset) {
        console.log('[ThemeSettingsLoader] Applying tweakcn theme:', user.selectedTweakcnTheme)
        applyTweakcnTheme(selectedPreset, isDarkMode)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id,
    user?.theme,
    user?.selectedTheme,
    user?.selectedTweakcnTheme,
    user?.selectedRadius,
    user?.importedThemeData,
    user?.brandColors,
    user?.sidebarVariant,
    user?.sidebarCollapsible,
    user?.sidebarSide,
    isDarkMode
  ])

  // This component doesn't render anything
  return null
}
