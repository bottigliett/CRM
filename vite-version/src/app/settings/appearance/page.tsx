"use client"

import { useState, useEffect } from "react"
import { BaseLayout } from "@/components/layouts/base-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout, Palette, RotateCcw, Sun, Moon, Monitor } from "lucide-react"
import { ThemeTab } from "@/components/theme-customizer/theme-tab"
import { LayoutTab } from "@/components/theme-customizer/layout-tab"
import { ImportModal } from "@/components/theme-customizer/import-modal"
import { useThemeManager } from "@/hooks/use-theme-manager"
import { useSidebarConfig } from "@/contexts/sidebar-context"
import { tweakcnThemes } from "@/config/theme-data"
import { useAuthStore } from "@/store/auth-store"
import { toast } from "sonner"
import type { ImportedTheme } from "@/types/theme-customizer"
import { SettingsNav } from "@/components/settings-nav"
import { Separator } from "@/components/ui/separator"

export default function AppearanceSettings() {
  const { applyImportedTheme, isDarkMode, resetTheme, applyRadius, setBrandColorsValues, applyTheme, applyTweakcnTheme, theme, setTheme } = useThemeManager()
  const { config: sidebarConfig, updateConfig: updateSidebarConfig } = useSidebarConfig()
  const { user, updateProfile } = useAuthStore()

  const [activeTab, setActiveTab] = useState("theme")
  const [selectedThemeMode, setSelectedThemeMode] = useState<"light" | "dark" | "system">("system")
  const [selectedTheme, setSelectedTheme] = useState("")
  const [selectedTweakcnTheme, setSelectedTweakcnTheme] = useState("")
  const [selectedRadius, setSelectedRadius] = useState("0.5rem")
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importedTheme, setImportedTheme] = useState<ImportedTheme | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load user's saved settings on mount (but don't apply themes - ThemeSettingsLoader handles that)
  useEffect(() => {
    if (user) {
      setSelectedThemeMode((user.theme as "light" | "dark" | "system") || "system")
      setSelectedTheme(user.selectedTheme || "")
      setSelectedTweakcnTheme(user.selectedTweakcnTheme || "")
      setSelectedRadius(user.selectedRadius || "0.5rem")

      // Load imported theme if exists
      if (user.importedThemeData) {
        try {
          const parsed = JSON.parse(user.importedThemeData)
          setImportedTheme(parsed)
        } catch (e) {
          console.error('Error parsing imported theme:', e)
        }
      } else {
        setImportedTheme(null)
      }

      // Load brand colors if exists
      if (user.brandColors) {
        try {
          const parsed = JSON.parse(user.brandColors)
          setBrandColorsValues(parsed)
        } catch (e) {
          console.error('Error parsing brand colors:', e)
        }
      }
    }
  }, [user, setBrandColorsValues])

  // Re-apply current selection when dark mode changes (for live preview on this page)
  useEffect(() => {
    // This ensures that when you toggle dark/light mode on the appearance page,
    // the currently selected theme updates immediately for preview
    if (importedTheme) {
      applyImportedTheme(importedTheme, isDarkMode)
    } else if (selectedTheme) {
      applyTheme(selectedTheme, isDarkMode)
    } else if (selectedTweakcnTheme) {
      const selectedPreset = tweakcnThemes.find(t => t.value === selectedTweakcnTheme)?.preset
      if (selectedPreset) {
        applyTweakcnTheme(selectedPreset, isDarkMode)
      }
    }
  }, [isDarkMode, importedTheme, selectedTheme, selectedTweakcnTheme, applyImportedTheme, applyTheme, applyTweakcnTheme])

  const handleReset = async () => {
    // Reset state
    setSelectedThemeMode("system")
    setSelectedTheme("")
    setSelectedTweakcnTheme("")
    setSelectedRadius("0.5rem")
    setImportedTheme(null)
    setBrandColorsValues({})

    // Reset theme
    setTheme("system")
    resetTheme()
    applyRadius("0.5rem")

    // Reset sidebar
    updateSidebarConfig({ variant: "inset", collapsible: "offcanvas", side: "left" })

    // Save to database
    await saveSettings({
      theme: "system",
      selectedTheme: null,
      selectedTweakcnTheme: null,
      selectedRadius: "0.5rem",
      importedThemeData: null,
      brandColors: null,
      sidebarVariant: "inset",
      sidebarCollapsible: "offcanvas",
      sidebarSide: "left",
    })

    toast.success("Impostazioni ripristinate ai valori predefiniti")
  }

  const handleImport = (themeData: ImportedTheme) => {
    setImportedTheme(themeData)
    setSelectedTheme("")
    setSelectedTweakcnTheme("")
    applyImportedTheme(themeData, isDarkMode)
  }

  const handleImportClick = () => {
    setImportModalOpen(true)
  }

  const saveSettings = async (settings: any) => {
    try {
      setIsSaving(true)
      await updateProfile(settings)
      toast.success("Impostazioni salvate con successo!")
    } catch (error) {
      toast.error("Errore nel salvataggio delle impostazioni")
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    const settings = {
      theme: selectedThemeMode,
      selectedTheme: selectedTheme || null,
      selectedTweakcnTheme: selectedTweakcnTheme || null,
      selectedRadius: selectedRadius || "0.5rem",
      importedThemeData: importedTheme ? JSON.stringify(importedTheme) : null,
      brandColors: null, // Will be implemented
      sidebarVariant: sidebarConfig.variant,
      sidebarCollapsible: sidebarConfig.collapsible,
      sidebarSide: sidebarConfig.side,
    }

    // Apply theme mode immediately
    setTheme(selectedThemeMode)

    await saveSettings(settings)
  }

  return (
    <BaseLayout>
      <div className="space-y-6 px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le impostazioni e le preferenze del tuo account.
          </p>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-16 lg:space-y-0">
          <aside className="-mx-3 lg:w-48">
            <SettingsNav />
          </aside>
          <div className="flex-1">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Aspetto</h2>
                  <p className="text-sm text-muted-foreground">
                    Personalizza l'aspetto e il layout della tua dashboard.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} className="cursor-pointer" disabled={isSaving}>
                    {isSaving ? "Salvataggio..." : "Salva Impostazioni"}
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="cursor-pointer">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Ripristina Predefinito
                  </Button>
                </div>
              </div>

        <Card>
          <CardHeader>
            <CardTitle>Personalizzazione</CardTitle>
            <CardDescription>
              Scegli il tema, i colori e il layout della tua dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Theme Mode Selector */}
            <div className="space-y-3 mb-6 pb-6 border-b">
              <Label className="text-sm font-medium">Modalità Tema</Label>
              <Select value={selectedThemeMode} onValueChange={(value: "light" | "dark" | "system") => setSelectedThemeMode(value)}>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Chiaro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Scuro</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>Sistema</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Seleziona la modalità del tema. "Sistema" utilizzerà le preferenze del tuo sistema operativo.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="theme" className="cursor-pointer">
                  <Palette className="h-4 w-4 mr-2" />
                  Tema
                </TabsTrigger>
                <TabsTrigger value="layout" className="cursor-pointer">
                  <Layout className="h-4 w-4 mr-2" />
                  Layout
                </TabsTrigger>
              </TabsList>

              <TabsContent value="theme" className="space-y-4 mt-6">
                <ThemeTab
                  selectedTheme={selectedTheme}
                  setSelectedTheme={setSelectedTheme}
                  selectedTweakcnTheme={selectedTweakcnTheme}
                  setSelectedTweakcnTheme={setSelectedTweakcnTheme}
                  selectedRadius={selectedRadius}
                  setSelectedRadius={setSelectedRadius}
                  setImportedTheme={setImportedTheme}
                  onImportClick={handleImportClick}
                />
              </TabsContent>

              <TabsContent value="layout" className="space-y-4 mt-6">
                <LayoutTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
            </div>
          </div>
        </div>
      </div>

      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImport}
      />
    </BaseLayout>
  )
}
