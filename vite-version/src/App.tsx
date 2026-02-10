import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/contexts/sidebar-context'
import { PinProtectionProvider } from '@/contexts/pin-protection-context'
import { AppRouter } from '@/components/router/app-router'
import { ThemeSettingsLoader } from '@/components/theme-settings-loader'
import { Toaster } from '@/components/ui/sonner'
import { useEffect } from 'react'
import { initGTM } from '@/utils/analytics'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth-store'
import { useModuleSettingsStore } from '@/store/module-settings-store'

// Get basename from environment (for deployment) or use empty string for development
const basename = import.meta.env.VITE_BASENAME || ''

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const fetchEnabledModules = useModuleSettingsStore((state) => state.fetchEnabledModules)

  // Initialize GTM and validate auth token on app load
  useEffect(() => {
    initGTM();

    // Validate token if it exists
    const validateToken = async () => {
      if (api.isAuthenticated()) {
        try {
          // Try to fetch current user to validate token
          await api.getCurrentUser();
          // Fetch enabled modules for visibility filtering
          await fetchEnabledModules();
        } catch (error) {
          // Token is invalid, clear it
          console.log('Token non valido, clearing authentication...');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          checkAuth(); // Update auth store
        }
      }
    };

    validateToken();
  }, [checkAuth, fetchEnabledModules]);

  return (
    <div className="font-sans antialiased" style={{ fontFamily: 'var(--font-inter)' }}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <PinProtectionProvider>
          <SidebarConfigProvider>
            <Router basename={basename}>
              <ThemeSettingsLoader />
              <AppRouter />
              <Toaster />
            </Router>
          </SidebarConfigProvider>
        </PinProtectionProvider>
      </ThemeProvider>
    </div>
  )
}

export default App
