import { useEffect, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { clientAuthAPI } from '@/lib/client-auth-api'
import { Loader2 } from 'lucide-react'

interface ClientProtectedRouteProps {
  children: React.ReactNode
}

export function ClientProtectedRoute({ children }: ClientProtectedRouteProps) {
  const [searchParams] = useSearchParams()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [clientData, setClientData] = useState<any>(null)
  const location = useLocation()

  useEffect(() => {
    // Check for preview token in URL first
    const previewToken = searchParams.get('preview_token')
    if (previewToken) {
      // Save preview token to sessionStorage immediately
      sessionStorage.setItem('client_preview_token', previewToken)
    }

    checkAuth()
  }, [searchParams])

  const checkAuth = async () => {
    try {
      const token = clientAuthAPI.getToken()
      if (!token) {
        setIsAuthenticated(false)
        return
      }

      // Verify token is still valid by calling /me
      const response = await clientAuthAPI.getMe()
      setClientData(response.data)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Auth check failed:', error)
      clientAuthAPI.logout()
      setIsAuthenticated(false)
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to='/client/login' replace />
  }

  // Access control: QUOTE_ONLY clients can only access /client/quotes
  if (clientData?.accessType === 'QUOTE_ONLY') {
    const allowedPaths = ['/client/quotes', '/client/settings', '/client/login']
    const currentPath = location.pathname

    if (!allowedPaths.some(path => currentPath.startsWith(path))) {
      return <Navigate to='/client/quotes' replace />
    }
  }

  return <>{children}</>
}
