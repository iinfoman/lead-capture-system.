import { useMemo, useState } from 'react'
import { LEAD_STATUSES } from '../../lib/constants'
import LeadCard from './LeadCard'

/**
 * Kanban board over the seven pipeline statuses.
 *
 * Drag-and-drop is plain HTML5 DnD rather than a library — it is a handful of
 * handlers, and it keeps the bundle (and the dependency list) small. Dragging
 * is not the only way to move a lead: the card opens a detail panel with a
 * status dropdown, which is what touch users and keyboard users will use.
 */
export default function LeadStatusBoard({ leads, onOpenLead, onStatusChange }) {
  const [dragOverStatus, setDragOverStatus] = useState(null)
  const [draggingId, setDraggingId] = useState(null)

  const grouped = useMemo(() => {
    const map = Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, []]))
    leads.forEach((lead) => {
      if (map[lead.status]) map[lead.status].push(lead)
    })
    return map
  }, [leads])

  function handleDrop(event, status) {
    event.preventDefault()
    setDragOverStatus(null)
    setDraggingId(null)

    const leadId = event.dataTransfer.getData('text/plain')
    const lead = leads.find((l) => l.id === leadId)
    if (lead && lead.status !== status) onStatusChange(lead, status)
  }

  return (
    <div className="scroll-slim -mx-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
      <div className="flex min-w-max gap-4">
        {LEAD_STATUSES.map((status) => {
          const items = grouped[status.value] ?? []
          const isTarget = dragOverStatus === status.value

          return (
            <section
              key={status.value}
              className={`flex w-[280px] shrink-0 flex-col rounded-2xl border-2 border-dashed bg-slate-100/70 transition ${
                isTarget ? `${status.column} bg-white` : 'border-transparent'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverStatus(status.value)
              }}
              onDragLeave={(e) => {
                // Only clear when the pointer actually leaves the column, not
                // when it crosses onto a child card inside it.
                if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStatus(null)
              }}
              onDrop={(e) => handleDrop(e, status.value)}
              aria-label={`${status.label} — ${items.length} lead${items.length === 1 ? '' : 's'}`}
            >
              <header className="sticky top-0 z-10 rounded-t-2xl px-3.5 pb-2 pt-3.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
                    {status.label}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    {items.length}
                  </span>
                </div>
                <p className="mt-0.5 pl-4 text-[11px] text-slate-400">{status.hint}</p>
              </header>

              <div className="scroll-slim flex max-h-[calc(100vh-19rem)] flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3.5">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                    {isTarget ? 'Drop here' : 'Nothing here'}
                  </p>
                ) : (
                  items.map((lead) => (
                    <div
                      key={lead.id}
                      className={draggingId === lead.id ? 'opacity-40' : undefined}
                    >
                      <LeadCard
                        lead={lead}
                        onOpen={onOpenLead}
                        onDragStart={(l) => setDraggingId(l.id)}
                        onDragEnd={() => setDraggingId(null)}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
