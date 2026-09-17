import { Link } from 'react-router-dom'
import { currency, relativeTime } from '../../lib/format'
import StatusBadge from '../dashboard/StatusBadge'

/**
 * Cross-tenant lead list. The business column is the point — this is the one
 * view where leads from different tenants sit side by side.
 */
export default function AllLeadsTable({ leads, onJumpToBusiness }) {
  if (leads.length === 0) {
    return (
      <p className="card px-5 py-10 text-center text-sm text-slate-500">
        No leads match those filters.
      </p>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="scroll-slim overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Business</th>
              <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
              <th scope="col" className="px-4 py-3 font-semibold">Service</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Quote</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onJumpToBusiness(lead.business)}
                    className="flex items-center gap-2 text-left font-semibold text-slate-800 hover:underline"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: lead.business?.primary_color ?? '#94a3b8' }}
                      aria-hidden="true"
                    />
                    {lead.business?.name ?? 'Unknown'}
                  </button>
                </td>

                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{lead.customer_name}</p>
                  <p className="text-xs text-slate-500">
                    {lead.phone}
                    {lead.location ? ` · ${lead.location}` : ''}
                  </p>
                </td>

                <td className="px-4 py-3 text-slate-600">{lead.service?.name ?? '—'}</td>

                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>

                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                  {currency(lead.quote_amount) ?? '—'}
                </td>

                <td className="px-4 py-3 text-right text-xs text-slate-500">
                  <time dateTime={lead.created_at}>{relativeTime(lead.created_at)}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        Showing {leads.length} lead{leads.length === 1 ? '' : 's'}. Click a business to open
        its dashboard. To work a specific lead, jump into that business and open it there —{' '}
        <Link to="/dashboard" className="underline underline-offset-2">
          the dashboard
        </Link>{' '}
        is where the contact and note tools live.
      </p>
    </div>
  )
}
