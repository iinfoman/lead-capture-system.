import { Route, Routes } from 'react-router-dom'
import AuthGuard from './components/common/AuthGuard'
import MasterAdminGuard from './components/admin/MasterAdminGuard'
import DashboardLayout from './pages/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import IndexPage from './pages/IndexPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import MasterAdminPage from './pages/MasterAdminPage'
import NotFoundPage from './pages/NotFoundPage'
import ServicesPage from './pages/ServicesPage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'
import ThankYouPage from './pages/ThankYouPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />

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

      {/* Tenant landing pages last: /:slug would otherwise swallow /login. */}
      <Route path="/:slug" element={<LandingPage />} />
      <Route path="/:slug/thank-you" element={<ThankYouPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
