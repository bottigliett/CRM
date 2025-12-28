import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    // Reindirizza alla pagina di login se non autenticato
    return <Navigate to="/auth/sign-in" replace />
  }

  return <>{children}</>
}
