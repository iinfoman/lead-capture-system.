import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { fetchAllBusinesses, fetchAllLeads } from '../lib/api'
import { LEAD_STATUSES } from '../lib/constants'
import { currency } from '../lib/format'
import AllLeadsTable from '../components/admin/AllLeadsTable'
import ErrorState from '../components/common/ErrorState'
import PageLoader from '../components/common/PageLoader'

export default function MasterAdminPage() {
  const { viewAs, user, signOut } = useAuth()
  const navigate = useNavigate()

  const [businesses, setBusinesses] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [businessFilter, setBusinessFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true

    Promise.all([fetchAllBusinesses(), fetchAllLeads()])
      .then(([b, l]) => {
        if (!active) return
        setBusinesses(b)
        setLeads(l)
      })
      .catch((err) => {
        if (!active) return
        console.error('[leadcapture] master admin load failed', err)
        setError(err.message ?? 'Could not load cross-tenant data.')
      })
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return leads.filter((lead) => {
      if (businessFilter !== 'all' && lead.business_id !== businessFilter) return false
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false
      if (term) {
        const haystack = [
          lead.customer_name,
          lead.phone,
          lead.email,
          lead.location,
          lead.description,
          lead.business?.name,
          lead.service?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [leads, businessFilter, statusFilter, search])

  const stats = useMemo(() => {
    const open = leads.filter((l) => !['completed', 'lost'].includes(l.status))
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000

    return {
      businesses: businesses.length,
      leads: leads.length,
      last24h: leads.filter((l) => new Date(l.created_at).getTime() >= dayAgo).length,
      pipeline: open.reduce((sum, l) => sum + (Number(l.quote_amount) || 0), 0),
    }
  }, [businesses, leads])

  // Per-business rollup: the quickest read on which client is actually using it.
  const perBusiness = useMemo(() => {
    return businesses
      .map((b) => {
        const rows = leads.filter((l) => l.business_id === b.id)
        return {
          ...b,
          total: rows.length,
          newCount: rows.filter((l) => l.status === 'new').length,
          latest: rows[0]?.created_at ?? null,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [businesses, leads])

  function jumpTo(business) {
    if (!business) return
    viewAs(business.id)
    navigate('/dashboard')
  }

  if (loading) return <PageLoader message="Loading every business…" />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">
              Platform
            </p>
            <h1 className="text-xl font-bold tracking-tight">Master admin</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-xs text-slate-300 sm:block">{user?.email}</span>
            <Link to="/dashboard" className="btn bg-white/10 py-2 text-sm text-white hover:bg-white/20">
              My dashboard
            </Link>
            <button type="button" onClick={signOut} className="btn py-2 text-sm text-slate-300 hover:bg-white/10">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-5 px-5 py-6 sm:px-8">
        {error ? (
          <ErrorState
            title="Could not load cross-tenant data"
            description={`${error} — check that your user id is in leadcapture.platform_admins and that the platform admin RLS policies were applied.`}
          />
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Businesses', value: stats.businesses },
            { label: 'Leads all time', value: stats.leads },
            { label: 'Last 24 hours', value: stats.last24h },
            { label: 'Open pipeline', value: currency(stats.pipeline) ?? 'R0' },
          ].map((s) => (
            <div key={s.label} className="card px-4 py-3.5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {s.label}
              </dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900">{s.value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Businesses
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {perBusiness.map((b) => (
              <li key={b.id} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{b.name}</p>
                    <p className="truncate text-xs text-slate-500">/{b.slug}</p>
                  </div>
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ background: b.primary_color ?? '#94a3b8' }}
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
                  <span>
                    <strong className="text-sm text-slate-900">{b.total}</strong> leads
                  </span>
                  {b.newCount > 0 ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">
                      {b.newCount} new
                    </span>
                  ) : null}
                  {!b.active ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">
                      Inactive
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => jumpTo(b)} className="btn btn-primary flex-1 py-2 text-xs">
                    Open dashboard
                  </button>
                  <a
                    href={`/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary py-2 text-xs"
                  >
                    Page ↗
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Every lead, every business
          </h2>

          <div className="card mt-3 flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across all businesses…"
              className="field flex-1"
              aria-label="Search all leads"
            />
            <div className="flex flex-wrap gap-2.5">
              <select
                value={businessFilter}
                onChange={(e) => setBusinessFilter(e.target.value)}
                className="field w-auto py-2 text-sm"
                aria-label="Filter by business"
              >
                <option value="all">All businesses</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="field w-auto py-2 text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <AllLeadsTable leads={filtered} onJumpToBusiness={jumpTo} />
          </div>
        </section>
      </main>
    </div>
  )
}
