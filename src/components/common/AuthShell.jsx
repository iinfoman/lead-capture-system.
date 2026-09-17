import { Outlet } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthProvider'

/**
 * Pathless layout route that supplies auth to everything behind a login.
 *
 * It exists so AuthProvider — and through it the Supabase SDK, with its
 * realtime and auth clients — is loaded lazily by the routes that need it,
 * instead of sitting above the whole app and riding along on every public
 * landing page view.
 */
export default function AuthShell() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}
