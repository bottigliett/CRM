import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'

interface AuthRouteProps {
  children: React.ReactNode
}

export function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    // Se già autenticato, reindirizza alla dashboard
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
