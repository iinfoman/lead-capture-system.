import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import BusinessSwitcher from '../components/admin/BusinessSwitcher'

const NAV = [
  { to: '/dashboard', label: 'Leads', end: true },
  { to: '/dashboard/services', label: 'Services' },
  { to: '/dashboard/settings', label: 'Settings' },
]

export default function DashboardLayout() {
  const { activeBusiness, user, signOut, isPlatformAdmin, isImpersonating, viewAs } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      {isImpersonating ? (
        <div className="bg-amber-400 px-5 py-2 text-center text-sm font-semibold text-amber-950">
          Viewing <strong>{activeBusiness.name}</strong> as a platform admin.{' '}
          <button type="button" onClick={() => viewAs(null)} className="underline underline-offset-2">
            Back to my own dashboard
          </button>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold"
              style={{
                background: activeBusiness?.primary_color ?? 'var(--brand-primary)',
                color: '#fff',
              }}
              aria-hidden="true"
            >
              {(activeBusiness?.name ?? '??').slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{activeBusiness?.name}</p>
              {activeBusiness?.slug ? (
                <Link
                  to={`/${activeBusiness.slug}`}
                  target="_blank"
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  View public page ↗
                </Link>
              ) : null}
            </div>
          </div>

          <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto" aria-label="Dashboard">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <BusinessSwitcher className="hidden sm:flex" />

            {isPlatformAdmin ? (
              <Link to="/master-admin" className="btn btn-secondary py-1.5 text-sm">
                Master admin
              </Link>
            ) : null}

            <div className="hidden text-right lg:block">
              <p className="max-w-[12rem] truncate text-xs text-slate-500">{user?.email}</p>
            </div>

            <button type="button" onClick={signOut} className="btn btn-ghost py-1.5 text-sm">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
