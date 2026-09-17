import { LEAD_STATUSES } from '../../lib/constants'

const DATE_RANGES = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

export default function SearchFilterBar({ filters, onChange, services, resultCount, totalCount }) {
  const active =
    filters.search || filters.status !== 'all' || filters.service !== 'all' || filters.range !== 'all'

  function set(patch) {
    onChange({ ...filters, ...patch })
  }

  return (
    <div className="card p-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search name, phone, area or what they asked for…"
            className="field pl-10"
            aria-label="Search leads"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select
            value={filters.status}
            onChange={(e) => set({ status: e.target.value })}
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

          <select
            value={filters.service}
            onChange={(e) => set({ service: e.target.value })}
            className="field w-auto py-2 text-sm"
            aria-label="Filter by service"
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={filters.range}
            onChange={(e) => set({ range: e.target.value })}
            className="field w-auto py-2 text-sm"
            aria-label="Filter by date"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {active ? (
            <button
              type="button"
              onClick={() => set({ search: '', status: 'all', service: 'all', range: 'all' })}
              className="btn btn-ghost text-sm"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {active ? (
        <p className="mt-2.5 text-xs text-slate-500" role="status">
          Showing <strong className="text-slate-700">{resultCount}</strong> of {totalCount} leads.
        </p>
      ) : null}
    </div>
  )
}
