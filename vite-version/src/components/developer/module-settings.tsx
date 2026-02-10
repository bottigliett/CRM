"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useModuleSettingsStore } from "@/store/module-settings-store"
import { Settings2, Eye, EyeOff, RefreshCw } from "lucide-react"

export function ModuleSettings() {
  const { modules, isLoading, fetchModules, toggleModule } = useModuleSettingsStore()
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const handleToggle = async (moduleName: string, currentState: boolean) => {
    setUpdating(moduleName)
    try {
      await toggleModule(moduleName, !currentState)
      toast.success(`Modulo "${moduleName}" ${!currentState ? 'attivato' : 'disattivato'}`)
    } catch (error: any) {
      toast.error(error.message || 'Errore durante l\'aggiornamento')
    } finally {
      setUpdating(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Page Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Page Visibility
            </CardTitle>
            <CardDescription>
              Gestisci la visibilità globale delle pagine. Le pagine disabilitate non appariranno nella sidebar per gli altri utenti.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchModules()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                module.isEnabled
                  ? 'bg-card hover:bg-muted/50'
                  : 'bg-muted/30 opacity-75'
              }`}
            >
              <div className="flex items-center gap-3">
                {module.isEnabled ? (
                  <Eye className="h-5 w-5 text-green-500" />
                ) : (
                  <EyeOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{module.label}</span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {module.moduleName}
                    </Badge>
                    {!module.isEnabled && (
                      <Badge variant="secondary" className="text-xs">
                        Nascosto
                      </Badge>
                    )}
                  </div>
                  {module.description && (
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  )}
                </div>
              </div>
              <Switch
                checked={module.isEnabled}
                onCheckedChange={() => handleToggle(module.moduleName, module.isEnabled)}
                disabled={updating === module.moduleName}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Tu come Developer puoi sempre vedere tutte le pagine, anche quelle disabilitate.
            Gli altri utenti (SUPER_ADMIN, ADMIN) non vedranno le pagine disabilitate nella sidebar.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
