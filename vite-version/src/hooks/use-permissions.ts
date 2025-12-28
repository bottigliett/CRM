import { useAuthStore } from "@/store/auth-store"

export function usePermissions() {
  const { user } = useAuthStore()

  const canAccessModule = (moduleName: string): boolean => {
    if (!user) return false

    // SUPER_ADMIN ha sempre tutti i permessi
    if (user.role === 'SUPER_ADMIN') return true

    // ADMIN deve avere il permesso specifico
    if (user.role === 'ADMIN') {
      const modulePermission = user.permissions?.find(p => p.moduleName === moduleName)
      return modulePermission ? modulePermission.hasAccess : false
    }

    // USER role ha accesso limitato
    return false
  }

  return {
    canAccessModule,
  }
}
