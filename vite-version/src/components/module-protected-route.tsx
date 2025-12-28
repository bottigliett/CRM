import { Navigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/use-permissions'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

interface ModuleProtectedRouteProps {
  children: React.ReactNode
  moduleName: string
}

export function ModuleProtectedRoute({ children, moduleName }: ModuleProtectedRouteProps) {
  const { canAccessModule } = usePermissions()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const access = canAccessModule(moduleName)
    setHasAccess(access)

    if (!access) {
      toast.error('Non hai i permessi per accedere a questa pagina')
    }
  }, [moduleName, canAccessModule])

  // Mostra loading mentre verifichiamo
  if (hasAccess === null) {
    return null
  }

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
