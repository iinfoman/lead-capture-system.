import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthProvider'
import PageLoader from './PageLoader'
import EmptyState from './EmptyState'

/**
 * Gate for everything under /dashboard. Waits for both the session and the
 * business membership to resolve — rendering the dashboard before we know the
 * user's business_id would fire an unscoped query and flash an empty board.
 */
export default function AuthGuard({ children }) {
  const { session, loading, profileLoading, activeBusiness, isPlatformAdmin, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader message="Checking your session…" />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (profileLoading) return <PageLoader message="Loading your business…" />

  if (!activeBusiness) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24">
        <EmptyState
          icon="🔑"
          title="Your login is not linked to a business yet"
          description={
            isPlatformAdmin
              ? 'You are a platform admin but do not own a business. Open the master admin view and pick one to work in.'
              : 'Ask whoever set this up to add a row in business_users linking your account to your business.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {isPlatformAdmin ? (
                <a href="/master-admin" className="btn btn-primary">
                  Go to master admin
                </a>
              ) : null}
              <button type="button" onClick={signOut} className="btn btn-secondary">
                Sign out
              </button>
            </div>
          }
        />
      </div>
    )
  }

  return children
}
