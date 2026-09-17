import { URGENCY_MAP } from '../../lib/constants'
import { currency, relativeTime } from '../../lib/format'

const URGENCY_STYLE = {
  emergency: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-slate-100 text-slate-600',
  low: 'bg-slate-100 text-slate-500',
}

export default function LeadCard({ lead, onOpen, draggable = true, onDragStart, onDragEnd }) {
  const urgent = lead.urgency === 'emergency' || lead.urgency === 'high'
  const quote = currency(lead.quote_amount)
  const overdue =
    lead.follow_up_date && new Date(lead.follow_up_date) < new Date(new Date().toDateString())

  return (
    <article
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(lead)
      }}
      onDragEnd={() => onDragEnd?.()}
      className={`card cursor-pointer p-3.5 transition hover:shadow-md active:cursor-grabbing ${
        urgent ? 'border-l-4 border-l-red-500' : ''
      }`}
      onClick={() => onOpen(lead)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(lead)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open lead from ${lead.customer_name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold leading-snug text-slate-900">{lead.customer_name}</h4>
        <time
          className="shrink-0 text-[11px] font-medium text-slate-400"
          dateTime={lead.created_at}
        >
          {relativeTime(lead.created_at)}
        </time>
      </div>

      {lead.service?.name ? (
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{lead.service.name}</p>
      ) : null}

      {lead.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
          {lead.description}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {lead.urgency ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              URGENCY_STYLE[lead.urgency] ?? URGENCY_STYLE.medium
            }`}
          >
            {URGENCY_MAP[lead.urgency]?.label ?? lead.urgency}
          </span>
        ) : null}

        {lead.location ? (
          <span className="text-[11px] text-slate-500">
            <span aria-hidden="true">📍</span> {lead.location}
          </span>
        ) : null}

        {quote ? (
          <span className="ml-auto text-xs font-bold text-slate-700">{quote}</span>
        ) : null}
      </div>

      {lead.follow_up_date ? (
        <p
          className={`mt-2.5 rounded-lg px-2 py-1 text-[11px] font-semibold ${
            overdue ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
          }`}
        >
          <span aria-hidden="true">{overdue ? '⏰' : '📅'}</span>{' '}
          {overdue ? 'Follow-up overdue' : 'Follow up'}{' '}
          {new Date(lead.follow_up_date).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'short',
          })}
        </p>
      ) : null}
    </article>
  )
}
