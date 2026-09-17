import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { deleteLead, fetchChildRows, fetchLeads, updateLead } from '../lib/api'
import { LEAD_STATUSES } from '../lib/constants'
import { currency } from '../lib/format'
import LeadDetailPanel from '../components/dashboard/LeadDetailPanel'
import LeadStatusBoard from '../components/dashboard/LeadStatusBoard'
import SearchFilterBar from '../components/dashboard/SearchFilterBar'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import PageLoader from '../components/common/PageLoader'

const EMPTY_FILTERS = { search: '', status: 'all', service: 'all', range: 'all' }

const RANGE_MS = {
  today: 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export default function DashboardPage() {
  const { activeBusiness } = useAuth()
  const { leadId } = useParams()
  const navigate = useNavigate()

  const [leads, setLeads] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const businessId = activeBusiness?.id

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    setError(null)
    try {
      const [leadRows, serviceRows] = await Promise.all([
        fetchLeads(businessId),
        fetchChildRows('services', businessId),
      ])
      setLeads(leadRows)
      setServices(serviceRows)
    } catch (err) {
      console.error('[leadcapture] dashboard load failed', err)
      setError(err.message ?? 'Could not load your leads.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    const cutoff = RANGE_MS[filters.range] ? Date.now() - RANGE_MS[filters.range] : null

    return leads.filter((lead) => {
      if (filters.status !== 'all' && lead.status !== filters.status) return false
      if (filters.service !== 'all' && lead.service_id !== filters.service) return false
      if (cutoff && new Date(lead.created_at).getTime() < cutoff) return false

      if (term) {
        const haystack = [
          lead.customer_name,
          lead.phone,
          lead.whatsapp,
          lead.email,
          lead.location,
          lead.description,
          lead.notes,
          lead.service?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(term)) return false
      }

      return true
    })
  }, [leads, filters])

  const selectedLead = leadId ? leads.find((l) => l.id === leadId) : null

  // A lead id in the URL that is not in this business's list means it was
  // deleted, or belongs to another tenant (RLS already refused it) — either
  // way, drop back to the board rather than showing an empty panel.
  useEffect(() => {
    if (leadId && !loading && !selectedLead) navigate('/dashboard', { replace: true })
  }, [leadId, loading, selectedLead, navigate])

  const stats = useMemo(() => {
    const open = leads.filter((l) => !['completed', 'lost'].includes(l.status))
    const pipeline = open.reduce((sum, l) => sum + (Number(l.quote_amount) || 0), 0)
    const dueToday = leads.filter(
      (l) => l.follow_up_date && new Date(l.follow_up_date) <= new Date(new Date().toDateString()),
    ).length

    return {
      newCount: leads.filter((l) => l.status === 'new').length,
      openCount: open.length,
      pipeline,
      dueToday,
    }
  }, [leads])

  async function handleSave(id, patch) {
    // Optimistic: the board should feel instant. On failure we reload, which
    // puts the card back where the database says it belongs.
    const previous = leads
    setLeads((rows) => rows.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    try {
      const updated = await updateLead(id, patch)
      setLeads((rows) => rows.map((l) => (l.id === id ? updated : l)))
    } catch (err) {
      setLeads(previous)
      throw err
    }
  }

  async function handleDelete(id) {
    try {
      await deleteLead(id)
      setLeads((rows) => rows.filter((l) => l.id !== id))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message ?? 'Could not delete that lead.')
    }
  }

  if (loading && leads.length === 0) return <PageLoader message="Loading your leads…" />

  if (error && leads.length === 0) {
    return <ErrorState title="Could not load your leads" description={error} onRetry={load} />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-500">
            Drag a card to move it, or open one to call, quote and take notes.
          </p>
        </div>
        <button type="button" onClick={load} className="btn btn-secondary py-2 text-sm">
          ↻ Refresh
        </button>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'New right now', value: stats.newCount, accent: stats.newCount > 0 },
          { label: 'Open leads', value: stats.openCount },
          { label: 'Quoted pipeline', value: currency(stats.pipeline) ?? 'R0' },
          { label: 'Follow-ups due', value: stats.dueToday, accent: stats.dueToday > 0 },
        ].map((stat) => (
          <div key={stat.label} className="card px-4 py-3.5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stat.label}
            </dt>
            <dd
              className={`mt-1 text-2xl font-bold ${
                stat.accent ? 'text-slate-900' : 'text-slate-700'
              }`}
              style={stat.accent ? { color: 'var(--brand-primary)' } : undefined}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <SearchFilterBar
        filters={filters}
        onChange={setFilters}
        services={services}
        resultCount={filtered.length}
        totalCount={leads.length}
      />

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {leads.length === 0 ? (
        <EmptyState
          icon="📥"
          title="No leads yet"
          description={
            activeBusiness?.slug
              ? 'Share your landing page and the first one will land right here.'
              : 'Once your page is live, submissions land here.'
          }
          action={
            activeBusiness?.slug ? (
              <a
                href={`/${activeBusiness.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Open my landing page ↗
              </a>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No leads match those filters"
          description="Try widening the date range or clearing the search."
          action={
            <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="btn btn-secondary">
              Clear filters
            </button>
          }
        />
      ) : (
        <LeadStatusBoard
          leads={filtered}
          onOpenLead={(lead) => navigate(`/dashboard/leads/${lead.id}`)}
          onStatusChange={(lead, status) =>
            // handleSave rolls the board back on failure; surface the reason
            // rather than leaving an unhandled rejection.
            handleSave(lead.id, { status }).catch((err) =>
              setError(err.message ?? 'Could not move that lead.'),
            )
          }
        />
      )}

      {selectedLead ? (
        <LeadDetailPanel
          lead={selectedLead}
          business={activeBusiness}
          onClose={() => navigate('/dashboard')}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}

      <p className="pt-2 text-xs text-slate-500">
        Pipeline runs {LEAD_STATUSES.map((s) => s.label).join(' → ')}.
      </p>
    </div>
  )
}
