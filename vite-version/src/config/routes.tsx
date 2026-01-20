import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'
import { AuthRoute } from '@/components/auth-route'
import { ModuleProtectedRoute } from '@/components/module-protected-route'
import { ClientProtectedRoute } from '@/components/client-protected-route'

// Lazy load components for better performance
const Dashboard = lazy(() => import('@/app/dashboard/page'))
const Tasks = lazy(() => import('@/app/tasks/page'))
const Calendar = lazy(() => import('@/app/calendar/page'))
const CalendarSettings = lazy(() => import('@/app/calendar/settings/page'))
const Users = lazy(() => import('@/app/users/page'))

// CRM pages
const LeadBoard = lazy(() => import('@/app/lead-board/page'))
const Contacts = lazy(() => import('@/app/contacts/page'))
const Clients = lazy(() => import('@/app/clients/page'))
const ClientDetail = lazy(() => import('@/app/clients/[id]/page'))
const Quotes = lazy(() => import('@/app/quotes/page'))
const QuoteCreate = lazy(() => import('@/app/quotes/create/page'))
const QuoteDetail = lazy(() => import('@/app/quotes/[id]/page'))
const QuoteEdit = lazy(() => import('@/app/quotes/[id]/edit/page'))
const Finance = lazy(() => import('@/app/finance/page'))
const Invoices = lazy(() => import('@/app/invoices/page'))
const Tickets = lazy(() => import('@/app/tickets/page'))

// Projects pages
const Projects = lazy(() => import('@/app/projects/page'))
const ProjectDetail = lazy(() => import('@/app/projects/[id]/page'))

// On Duty page
const OnDuty = lazy(() => import('@/app/on-duty/page'))

// Auth pages
const SignIn = lazy(() => import('@/app/auth/sign-in/page'))
const SignIn2 = lazy(() => import('@/app/auth/sign-in-2/page'))
const SignIn3 = lazy(() => import('@/app/auth/sign-in-3/page'))

// Client pages
const ClientActivation = lazy(() => import('@/app/client/activate/page'))
const ClientLogin = lazy(() => import('@/app/client/login/page'))
const ClientDashboard = lazy(() => import('@/app/client/dashboard/page'))
const ClientQuotes = lazy(() => import('@/app/client/quotes/page'))
const ClientQuotesThankYou = lazy(() => import('@/app/client/quotes/thank-you/page'))
const ClientInvoices = lazy(() => import('@/app/client/invoices/page'))
const ClientTickets = lazy(() => import('@/app/client/tickets/page'))
const ClientTicketDetail = lazy(() => import('@/app/client/tickets/[id]/page'))
const ClientDocuments = lazy(() => import('@/app/client/documents/page'))
const ClientTasks = lazy(() => import('@/app/client/tasks/page'))
const ClientCalendar = lazy(() => import('@/app/client/calendar/page'))
const ClientSettings = lazy(() => import('@/app/client/settings/page'))
const SignUp = lazy(() => import('@/app/auth/sign-up/page'))
const SignUp2 = lazy(() => import('@/app/auth/sign-up-2/page'))
const SignUp3 = lazy(() => import('@/app/auth/sign-up-3/page'))
const ForgotPassword = lazy(() => import('@/app/auth/forgot-password/page'))
const ForgotPassword2 = lazy(() => import('@/app/auth/forgot-password-2/page'))
const ForgotPassword3 = lazy(() => import('@/app/auth/forgot-password-3/page'))

// Error pages
const Unauthorized = lazy(() => import('@/app/errors/unauthorized/page'))
const Forbidden = lazy(() => import('@/app/errors/forbidden/page'))
const NotFound = lazy(() => import('@/app/errors/not-found/page'))
const InternalServerError = lazy(() => import('@/app/errors/internal-server-error/page'))
const UnderMaintenance = lazy(() => import('@/app/errors/under-maintenance/page'))

// Settings pages
const UserSettings = lazy(() => import('@/app/settings/user/page'))
const AccountSettings = lazy(() => import('@/app/settings/account/page'))
const BillingSettings = lazy(() => import('@/app/settings/billing/page'))
const AppearanceSettings = lazy(() => import('@/app/settings/appearance/page'))
const NotificationSettings = lazy(() => import('@/app/settings/notifications/page'))
const ConnectionSettings = lazy(() => import('@/app/settings/connections/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  // Default route - redirect to dashboard
  {
    path: "/",
    element: <ProtectedRoute><Navigate to="dashboard" replace /></ProtectedRoute>
  },

  // Dashboard Routes
  {
    path: "/dashboard",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="dashboard"><Dashboard /></ModuleProtectedRoute></ProtectedRoute>
  },

  // CRM Routes
  {
    path: "/lead-board",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="lead_board"><LeadBoard /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/contacts",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="contacts"><Contacts /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/clients",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="clients"><Clients /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/clients/:id",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="clients"><ClientDetail /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/quotes",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="quotes"><Quotes /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/quotes/create",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="quotes"><QuoteCreate /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/quotes/:id",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="quotes"><QuoteDetail /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/quotes/:id/edit",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="quotes"><QuoteEdit /></ModuleProtectedRoute></ProtectedRoute>
  },

  // Gestione Routes
  {
    path: "/calendar",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="calendar"><Calendar /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/calendar/settings",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="calendar"><CalendarSettings /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/tasks",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="tasks"><Tasks /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/projects",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="projects"><Projects /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/projects/:id",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="projects"><ProjectDetail /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/finance",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="finance"><Finance /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/invoices",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="invoices"><Invoices /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/tickets",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="tickets"><Tickets /></ModuleProtectedRoute></ProtectedRoute>
  },
  {
    path: "/on-duty",
    element: <ProtectedRoute><ModuleProtectedRoute moduleName="on_duty"><OnDuty /></ModuleProtectedRoute></ProtectedRoute>
  },

  // Amministrazione (Users page remains SUPER_ADMIN only - no module permission)
  {
    path: "/users",
    element: <ProtectedRoute><Users /></ProtectedRoute>
  },

  // Authentication Routes
  {
    path: "/auth/sign-in",
    element: <AuthRoute><SignIn /></AuthRoute>
  },
  {
    path: "/auth/sign-in-2",
    element: <AuthRoute><SignIn2 /></AuthRoute>
  },
  {
    path: "/auth/sign-in-3",
    element: <AuthRoute><SignIn3 /></AuthRoute>
  },
  {
    path: "/auth/sign-up",
    element: <AuthRoute><SignUp /></AuthRoute>
  },
  {
    path: "/auth/sign-up-2",
    element: <AuthRoute><SignUp2 /></AuthRoute>
  },
  {
    path: "/auth/sign-up-3",
    element: <AuthRoute><SignUp3 /></AuthRoute>
  },
  {
    path: "/auth/forgot-password",
    element: <AuthRoute><ForgotPassword /></AuthRoute>
  },
  {
    path: "/auth/forgot-password-2",
    element: <AuthRoute><ForgotPassword2 /></AuthRoute>
  },
  {
    path: "/auth/forgot-password-3",
    element: <AuthRoute><ForgotPassword3 /></AuthRoute>
  },

  // Client Routes (Public)
  {
    path: "/client/activate",
    element: <ClientActivation />
  },
  {
    path: "/client/login",
    element: <ClientLogin />
  },

  // Client Routes (Protected)
  {
    path: "/client/dashboard",
    element: <ClientProtectedRoute><ClientDashboard /></ClientProtectedRoute>
  },
  {
    path: "/client/quotes",
    element: <ClientProtectedRoute><ClientQuotes /></ClientProtectedRoute>
  },
  {
    path: "/client/quotes/thank-you",
    element: <ClientProtectedRoute><ClientQuotesThankYou /></ClientProtectedRoute>
  },
  {
    path: "/client/invoices",
    element: <ClientProtectedRoute><ClientInvoices /></ClientProtectedRoute>
  },
  {
    path: "/client/tickets",
    element: <ClientProtectedRoute><ClientTickets /></ClientProtectedRoute>
  },
  {
    path: "/client/tickets/:id",
    element: <ClientProtectedRoute><ClientTicketDetail /></ClientProtectedRoute>
  },
  {
    path: "/client/documents",
    element: <ClientProtectedRoute><ClientDocuments /></ClientProtectedRoute>
  },
  {
    path: "/client/tasks",
    element: <ClientProtectedRoute><ClientTasks /></ClientProtectedRoute>
  },
  {
    path: "/client/calendar",
    element: <ClientProtectedRoute><ClientCalendar /></ClientProtectedRoute>
  },
  {
    path: "/client/settings",
    element: <ClientProtectedRoute><ClientSettings /></ClientProtectedRoute>
  },

  // Error Pages
  {
    path: "/errors/unauthorized",
    element: <Unauthorized />
  },
  {
    path: "/errors/forbidden",
    element: <Forbidden />
  },
  {
    path: "/errors/not-found",
    element: <NotFound />
  },
  {
    path: "/errors/internal-server-error",
    element: <InternalServerError />
  },
  {
    path: "/errors/under-maintenance",
    element: <UnderMaintenance />
  },

  // Settings Routes
  {
    path: "/settings/user",
    element: <ProtectedRoute><UserSettings /></ProtectedRoute>
  },
  {
    path: "/settings/account",
    element: <ProtectedRoute><AccountSettings /></ProtectedRoute>
  },
  {
    path: "/settings/billing",
    element: <ProtectedRoute><BillingSettings /></ProtectedRoute>
  },
  {
    path: "/settings/appearance",
    element: <ProtectedRoute><AppearanceSettings /></ProtectedRoute>
  },
  {
    path: "/settings/notifications",
    element: <ProtectedRoute><NotificationSettings /></ProtectedRoute>
  },
  {
    path: "/settings/connections",
    element: <ProtectedRoute><ConnectionSettings /></ProtectedRoute>
  },

  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />
  }
]
