import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import PageLoader from './components/common/PageLoader'
import IndexPage from './pages/IndexPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import ThankYouPage from './pages/ThankYouPage'

// The public landing page is the only route a customer ever hits, and they are
// often on a prepaid bundle on a mid-range Android. Everything behind a login
// is split out — including the Supabase SDK itself, which is reached only
// through AuthShell — so none of it is downloaded to read a plumber's page.
const AuthShell = lazy(() => import('./components/common/AuthShell'))
const AuthGuard = lazy(() => import('./components/common/AuthGuard'))
const MasterAdminGuard = lazy(() => import('./components/admin/MasterAdminGuard'))
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ServicesPage = lazy(() => import('./pages/ServicesPage'))
const MasterAdminPage = lazy(() => import('./pages/MasterAdminPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<IndexPage />} />

        {/* Everything inside this layout route gets AuthProvider. */}
        <Route element={<AuthShell />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <DashboardLayout />
              </AuthGuard>
            }
          >
            <Route index element={<DashboardPage />} />
            {/* The lead detail is a drawer over the board, so it shares the route. */}
            <Route path="leads/:leadId" element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="services" element={<ServicesPage />} />
          </Route>

          <Route
            path="/master-admin"
            element={
              <MasterAdminGuard>
                <MasterAdminPage />
              </MasterAdminGuard>
            }
          />
        </Route>

        {/* Tenant landing pages last: /:slug would otherwise swallow /login. */}
        <Route path="/:slug" element={<LandingPage />} />
        <Route path="/:slug/thank-you" element={<ThankYouPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
