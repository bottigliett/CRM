import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import { useModuleSettingsStore } from '@/store/module-settings-store'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

interface ModuleProtectedRouteProps {
  children: React.ReactNode
  moduleName: string
}

export function ModuleProtectedRoute({ children, moduleName }: ModuleProtectedRouteProps) {
  const { canAccessModule } = usePermissions()
  const { isModuleEnabled } = useModuleSettingsStore()
  const { user } = useAuthStore()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    // Check user permission first
    const hasUserPermission = canAccessModule(moduleName)

    // Check global module visibility (DEVELOPER bypasses this check)
    const isDeveloper = user?.role === 'DEVELOPER'
    const isGloballyEnabled = isDeveloper || isModuleEnabled(moduleName)

    const access = hasUserPermission && isGloballyEnabled
    setHasAccess(access)

    if (!hasUserPermission) {
      toast.error('Non hai i permessi per accedere a questa pagina')
    } else if (!isGloballyEnabled) {
      toast.error('Questa pagina non è attualmente disponibile')
    }
  }, [moduleName, canAccessModule, isModuleEnabled, user])

  // Mostra loading mentre verifichiamo
  if (hasAccess === null) {
    return null
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
