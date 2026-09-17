import { useEffect, useState } from 'react'
import {
  deleteChildRow,
  fetchChildRows,
  uploadBusinessImage,
  upsertChildRow,
} from '../../lib/api'
import { validatePhotoFile } from '../../lib/validation'
import Spinner from '../common/Spinner'
import EmptyState from '../common/EmptyState'

/**
 * One editor for every "list of things attached to a business": services,
 * testimonials, FAQs and work photos all have the same shape (business_id +
 * sort_order + a few fields), so they share this component rather than four
 * near-identical pages. Callers supply a field schema.
 */
export default function ChildRowEditor({
  table,
  businessId,
  title,
  description,
  fields,
  blank,
  labelOf,
  addLabel = 'Add',
  imageFolder,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [drafts, setDrafts] = useState({})

  useEffect(() => {
    let active = true
    setLoading(true)

    fetchChildRows(table, businessId)
      .then((data) => {
        if (!active) return
        setRows(data)
        setDrafts(Object.fromEntries(data.map((r) => [r.id, { ...r }])))
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [table, businessId])

  function draftFor(row) {
    return drafts[row.id] ?? row
  }

  function setDraft(id, patch) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? {}), ...patch } }))
  }

  function addRow() {
    // A client-side id lets a brand-new row use exactly the same edit path as
    // an existing one; upsert turns it into a real row on save.
    const id = crypto.randomUUID()
    const row = { id, business_id: businessId, sort_order: rows.length + 1, ...blank }
    setRows((r) => [...r, row])
    setDrafts((d) => ({ ...d, [id]: row }))
    setOpenId(id)
  }

  async function save(row) {
    setSavingId(row.id)
    setError(null)
    try {
      const draft = draftFor(row)
      const payload = { ...draft, business_id: businessId }
      // Empty numeric inputs arrive as '' and Postgres will not take that.
      fields.forEach((f) => {
        if (f.type === 'number' && payload[f.name] === '') payload[f.name] = null
      })
      const saved = await upsertChildRow(table, payload)
      setRows((r) => r.map((x) => (x.id === row.id ? saved : x)))
      setDrafts((d) => ({ ...d, [saved.id]: { ...saved } }))
      setOpenId(null)
    } catch (err) {
      setError(err.message ?? 'Could not save that.')
    } finally {
      setSavingId(null)
    }
  }

  async function remove(row) {
    setSavingId(row.id)
    try {
      // A row that was never saved only exists in local state.
      if (rows.some((r) => r.id === row.id && r.created_at)) {
        await deleteChildRow(table, row.id)
      }
      setRows((r) => r.filter((x) => x.id !== row.id))
    } catch (err) {
      setError(err.message ?? 'Could not delete that.')
    } finally {
      setSavingId(null)
    }
  }

  async function handleImage(row, file) {
    const problem = validatePhotoFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setSavingId(row.id)
    try {
      const url = await uploadBusinessImage(businessId, imageFolder ?? 'work', file)
      setDraft(row.id, { image_url: url })
    } catch (err) {
      setError(err.message ?? 'Upload failed.')
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <Spinner label={`Loading ${title.toLowerCase()}…`} />
      </div>
    )
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        <button type="button" onClick={addRow} className="btn btn-primary py-2 text-sm">
          + {addLabel}
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon="✏️"
            title={`No ${title.toLowerCase()} yet`}
            description="Whatever you add here shows up on your public page straight away."
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {rows.map((row) => {
            const draft = draftFor(row)
            const open = openId === row.id
            const busy = savingId === row.id

            return (
              <li key={row.id} className="rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : row.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={open}
                  >
                    {row.image_url || draft.image_url ? (
                      <img
                        src={draft.image_url || row.image_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {labelOf(draft) || 'Untitled'}
                      </span>
                      {'active' in draft && !draft.active ? (
                        <span className="text-xs font-medium text-slate-400">Hidden</span>
                      ) : null}
                    </span>
                    <span className="ml-auto shrink-0 text-slate-400" aria-hidden="true">
                      {open ? '▾' : '▸'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => remove(row)}
                    disabled={busy}
                    className="btn btn-ghost px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${labelOf(draft) || 'item'}`}
                  >
                    Delete
                  </button>
                </div>

                {open ? (
                  <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                    {fields.map((field) => (
                      <div key={field.name}>
                        <label htmlFor={`${row.id}-${field.name}`} className="label">
                          {field.label}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            id={`${row.id}-${field.name}`}
                            rows={field.rows ?? 3}
                            value={draft[field.name] ?? ''}
                            onChange={(e) => setDraft(row.id, { [field.name]: e.target.value })}
                            placeholder={field.placeholder}
                            className="field resize-y"
                          />
                        ) : field.type === 'image' ? (
                          <div className="flex items-center gap-3">
                            <input
                              id={`${row.id}-${field.name}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(e) =>
                                e.target.files?.[0] && handleImage(row, e.target.files[0])
                              }
                              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                            />
                            {busy ? <Spinner className="h-4 w-4 text-slate-400" /> : null}
                          </div>
                        ) : field.type === 'select' ? (
                          <select
                            id={`${row.id}-${field.name}`}
                            value={draft[field.name] ?? ''}
                            onChange={(e) => setDraft(row.id, { [field.name]: e.target.value })}
                            className="field"
                          >
                            {field.options.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'checkbox' ? (
                          <label className="flex items-center gap-2.5 text-sm text-slate-700">
                            <input
                              id={`${row.id}-${field.name}`}
                              type="checkbox"
                              checked={Boolean(draft[field.name])}
                              onChange={(e) => setDraft(row.id, { [field.name]: e.target.checked })}
                              className="h-4 w-4 rounded accent-[var(--brand-primary)]"
                            />
                            {field.checkboxLabel ?? 'Enabled'}
                          </label>
                        ) : (
                          <input
                            id={`${row.id}-${field.name}`}
                            type={field.type === 'number' ? 'number' : 'text'}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            value={draft[field.name] ?? ''}
                            onChange={(e) =>
                              setDraft(row.id, {
                                [field.name]:
                                  field.type === 'number' && e.target.value !== ''
                                    ? Number(e.target.value)
                                    : e.target.value,
                              })
                            }
                            placeholder={field.placeholder}
                            className="field"
                          />
                        )}

                        {field.hint ? <p className="hint">{field.hint}</p> : null}
                      </div>
                    ))}

                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => save(row)}
                        disabled={busy}
                        className="btn btn-primary py-2 text-sm"
                      >
                        {busy ? <Spinner className="h-4 w-4" /> : null}
                        {busy ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenId(null)}
                        className="btn btn-ghost py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
