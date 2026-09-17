import { useEffect, useRef, useState } from 'react'
import { LEAD_STATUSES, URGENCY_MAP } from '../../lib/constants'
import { currency, fullDate, telLink, whatsappLink } from '../../lib/format'
import { formatPhoneLocal } from '../../lib/validation'
import StatusBadge from './StatusBadge'
import Spinner from '../common/Spinner'

/**
 * Slide-over panel for a single lead: contact the customer, move them through
 * the pipeline, record a quote, set a follow-up and keep notes.
 *
 * Quote / follow-up / notes are saved explicitly so a half-typed note is never
 * committed; status changes save immediately because that is the one action an
 * owner does constantly and should not have to confirm.
 */
export default function LeadDetailPanel({ lead, business, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState({
    quote_amount: lead.quote_amount ?? '',
    follow_up_date: lead.follow_up_date ?? '',
    notes: lead.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    setDraft({
      quote_amount: lead.quote_amount ?? '',
      follow_up_date: lead.follow_up_date ?? '',
      notes: lead.notes ?? '',
    })
    setConfirmDelete(false)
    setError(null)
  }, [lead.id, lead.quote_amount, lead.follow_up_date, lead.notes])

  useEffect(() => {
    panelRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const dirty =
    String(draft.quote_amount ?? '') !== String(lead.quote_amount ?? '') ||
    String(draft.follow_up_date ?? '') !== String(lead.follow_up_date ?? '') ||
    String(draft.notes ?? '') !== String(lead.notes ?? '')

  const waMessage =
    `Hi ${lead.customer_name.split(' ')[0]}, it's ${business?.name ?? 'us'} — ` +
    `thanks for your enquiry${lead.service?.name ? ` about ${lead.service.name.toLowerCase()}` : ''}.`
  const wa = whatsappLink(lead.whatsapp || lead.phone, waMessage)

  async function changeStatus(status) {
    setStatusSaving(true)
    setError(null)
    try {
      await onSave(lead.id, { status })
    } catch (err) {
      setError(err.message ?? 'Could not update the status.')
    } finally {
      setStatusSaving(false)
    }
  }

  async function saveDetails() {
    setSaving(true)
    setError(null)
    try {
      await onSave(lead.id, {
        quote_amount: draft.quote_amount === '' ? null : Number(draft.quote_amount),
        follow_up_date: draft.follow_up_date || null,
        notes: draft.notes || null,
      })
      setSavedAt(Date.now())
    } catch (err) {
      setError(err.message ?? 'Could not save your changes.')
    } finally {
      setSaving(false)
    }
  }

  const contactRows = [
    { label: 'Phone', value: formatPhoneLocal(lead.phone), href: telLink(lead.phone) },
    lead.whatsapp && {
      label: 'WhatsApp',
      value: formatPhoneLocal(lead.whatsapp),
      href: whatsappLink(lead.whatsapp, waMessage),
      external: true,
    },
    lead.email && { label: 'Email', value: lead.email, href: `mailto:${lead.email}` },
    lead.location && { label: 'Area', value: lead.location },
    lead.preferred_contact && { label: 'Prefers', value: lead.preferred_contact },
  ].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-panel-title"
        className="scroll-slim relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl outline-none animate-slide-in-right sm:max-w-lg"
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="lead-panel-title"
                className="truncate text-lg font-bold tracking-tight text-slate-900"
              >
                {lead.customer_name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {lead.service?.name ? `${lead.service.name} · ` : ''}
                {fullDate(lead.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost -mr-2 -mt-1 px-2.5 py-1.5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} size="md" />
            {lead.urgency ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {URGENCY_MAP[lead.urgency]?.label ?? lead.urgency}
              </span>
            ) : null}
          </div>
        </header>

        <div className="flex-1 space-y-6 px-5 py-5">
          {/* Contact actions first — this is what the owner opened the panel to do. */}
          <div className="grid grid-cols-2 gap-2.5">
            <a href={telLink(lead.phone)} className="btn btn-primary py-2.5">
              <span aria-hidden="true">📞</span> Call
            </a>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-[#25D366] py-2.5 text-white hover:bg-[#1ebe5b]"
              >
                <span aria-hidden="true">💬</span> WhatsApp
              </a>
            ) : (
              <a
                href={lead.email ? `mailto:${lead.email}` : '#'}
                className={`btn btn-secondary py-2.5 ${lead.email ? '' : 'pointer-events-none opacity-50'}`}
              >
                <span aria-hidden="true">✉️</span> Email
              </a>
            )}
          </div>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact</h3>
            <dl className="mt-2.5 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {contactRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
                  <dd className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {row.href ? (
                      <a
                        href={row.href}
                        {...(row.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className="hover:underline"
                      >
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
              What they asked for
            </h3>
            <p className="mt-2.5 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3.5 text-sm leading-relaxed text-slate-700">
              {lead.description || 'No description given.'}
            </p>

            {lead.photo_url ? (
              <a
                href={lead.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block overflow-hidden rounded-xl border border-slate-200"
              >
                <img
                  src={lead.photo_url}
                  alt="Photo the customer attached"
                  className="max-h-56 w-full object-cover"
                />
              </a>
            ) : null}
          </section>

          <section>
            <label htmlFor="status" className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Status
            </label>
            <div className="mt-2.5 flex items-center gap-2">
              <select
                id="status"
                value={lead.status}
                disabled={statusSaving}
                onChange={(e) => changeStatus(e.target.value)}
                className="field"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label} — {s.hint}
                  </option>
                ))}
              </select>
              {statusSaving ? <Spinner className="h-4 w-4 text-slate-400" /> : null}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
            <div>
              <label htmlFor="quote_amount" className="label">
                Quote amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  R
                </span>
                <input
                  id="quote_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.quote_amount}
                  onChange={(e) => setDraft((d) => ({ ...d, quote_amount: e.target.value }))}
                  placeholder="0.00"
                  className="field pl-8"
                />
              </div>
              {lead.quote_amount ? (
                <p className="hint">Currently quoted at {currency(lead.quote_amount)}.</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="follow_up_date" className="label">
                Follow up on
              </label>
              <input
                id="follow_up_date"
                type="date"
                value={draft.follow_up_date}
                onChange={(e) => setDraft((d) => ({ ...d, follow_up_date: e.target.value }))}
                className="field"
              />
            </div>

            <div>
              <label htmlFor="notes" className="label">
                Private notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="What you agreed, what to check, who you spoke to…"
                className="field resize-y"
              />
              <p className="hint">Only your team sees this — never the customer.</p>
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveDetails}
                disabled={!dirty || saving}
                className="btn btn-primary"
              >
                {saving ? <Spinner className="h-4 w-4" /> : null}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {!dirty && savedAt ? (
                <span className="text-xs font-medium text-emerald-600">Saved ✓</span>
              ) : null}
            </div>
          </section>

          <section className="border-t border-slate-100 pt-5">
            {confirmDelete ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900">Delete this lead permanently?</p>
                <p className="mt-1 text-xs text-red-700">
                  {lead.customer_name}&rsquo;s details and notes will be gone for good.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(lead.id)}
                    className="btn bg-red-600 py-2 text-white hover:bg-red-700"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="btn btn-secondary py-2"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn btn-danger text-sm"
              >
                Delete lead
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
