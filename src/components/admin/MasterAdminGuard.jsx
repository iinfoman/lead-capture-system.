import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import PageLoader from '../common/PageLoader'
import EmptyState from '../common/EmptyState'

/**
 * Renders /master-admin only for accounts listed in `platform_admins`.
 *
 * This check is a courtesy, not the security boundary — the real one is the
 * "platform admin" RLS policies in Postgres. Someone who forces this component
 * to render still gets nothing back from the database.
 */
export default function MasterAdminGuard({ children }) {
  const { session, loading, profileLoading, isPlatformAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader message="Checking your session…" />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (profileLoading) return <PageLoader message="Checking permissions…" />

  if (!isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24">
        <EmptyState
          icon="🚫"
          title="Master admin only"
          description="This area is limited to platform admins. If that should be you, add your auth user id to leadcapture.platform_admins from the SQL editor."
          action={
            <a href="/dashboard" className="btn btn-primary">
              Back to my dashboard
            </a>
          }
        />
      </div>
    )
  }

  return children
}
