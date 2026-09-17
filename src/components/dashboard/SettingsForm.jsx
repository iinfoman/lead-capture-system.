import { useEffect, useState } from 'react'
import { updateBusiness, uploadBusinessImage } from '../../lib/api'
import { validatePhotoFile } from '../../lib/validation'
import Spinner from '../common/Spinner'

const HOUR_KEYS = [
  { key: 'mon_fri', label: 'Monday – Friday', placeholder: '07:00 - 17:00' },
  { key: 'sat', label: 'Saturday', placeholder: '08:00 - 13:00' },
  { key: 'sun', label: 'Sunday', placeholder: 'Closed' },
  { key: 'emergency', label: 'Emergency cover', placeholder: '24/7 for burst pipes' },
]

const PRESET_COLORS = ['#0f766e', '#1d4ed8', '#b91c1c', '#c2410c', '#7c3aed', '#0891b2', '#15803d']

export default function SettingsForm({ business, onSaved }) {
  const [form, setForm] = useState(business)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(business)
  }, [business])

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }))
    setSaved(false)
  }

  function setHour(key, value) {
    set({ hours: { ...(form.hours ?? {}), [key]: value } })
  }

  async function handleLogo(file) {
    const problem = validatePhotoFile(file)
    if (problem) {
      setError(problem)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const url = await uploadBusinessImage(business.id, 'branding', file)
      set({ logo_url: url })
    } catch (err) {
      setError(err.message ?? 'Could not upload that logo.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await updateBusiness(business.id, {
        name: form.name,
        tagline: form.tagline || null,
        about: form.about || null,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        phone: form.phone || null,
        whatsapp_number: form.whatsapp_number || null,
        email: form.email || null,
        service_area: form.service_area || null,
        hours: form.hours ?? null,
        google_review_link: form.google_review_link || null,
      })
      onSaved(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message ?? 'Could not save your settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Business details</h2>
        <p className="mt-1 text-sm text-slate-500">
          This is what customers see at the top of your page.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">
              Business name
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name ?? ''}
              onChange={(e) => set({ name: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="slug" className="label">
              Page address
            </label>
            <input
              id="slug"
              type="text"
              value={form.slug ?? ''}
              readOnly
              className="field cursor-not-allowed bg-slate-50 text-slate-500"
            />
            <p className="hint">
              Your page lives at /{form.slug}. Changing this would break links already
              out there, so it is fixed — ask support if you really need it moved.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="tagline" className="label">
            Headline
          </label>
          <input
            id="tagline"
            type="text"
            value={form.tagline ?? ''}
            onChange={(e) => set({ tagline: e.target.value })}
            placeholder="Burst pipe? Blocked drain? We are there today."
            className="field"
          />
          <p className="hint">One line. Say what you fix and how fast.</p>
        </div>

        <div className="mt-5">
          <label htmlFor="about" className="label">
            About
          </label>
          <textarea
            id="about"
            rows={3}
            value={form.about ?? ''}
            onChange={(e) => set({ about: e.target.value })}
            className="field resize-y"
          />
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Look and feel</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your colours apply to the page the moment you save — no rebuild needed.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div>
            <span className="label">Logo</span>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt="Your logo"
                  className="h-14 w-14 rounded-xl border border-slate-200 object-contain p-1"
                />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                  None
                </span>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
                className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                aria-label="Upload logo"
              />
              {uploading ? <Spinner className="h-4 w-4 text-slate-400" /> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="primary_color" className="label">
              Main colour
            </label>
            <div className="flex items-center gap-2.5">
              <input
                id="primary_color"
                type="color"
                value={form.primary_color ?? '#0f766e'}
                onChange={(e) => set({ primary_color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300"
              />
              <input
                type="text"
                value={form.primary_color ?? ''}
                onChange={(e) => set({ primary_color: e.target.value })}
                className="field font-mono text-sm"
                aria-label="Main colour hex value"
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set({ primary_color: c })}
                  className="h-7 w-7 rounded-lg ring-1 ring-inset ring-black/10 transition hover:scale-110"
                  style={{ background: c }}
                  aria-label={`Use ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="secondary_color" className="label">
              Dark accent
            </label>
            <div className="flex items-center gap-2.5">
              <input
                id="secondary_color"
                type="color"
                value={form.secondary_color ?? '#111827'}
                onChange={(e) => set({ secondary_color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300"
              />
              <input
                type="text"
                value={form.secondary_color ?? ''}
                onChange={(e) => set({ secondary_color: e.target.value })}
                className="field font-mono text-sm"
                aria-label="Dark accent hex value"
              />
            </div>
            <p className="hint">Used behind the headline at the top of your page.</p>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">Contact &amp; area</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+27 21 555 0142"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="whatsapp_number" className="label">
              WhatsApp number
            </label>
            <input
              id="whatsapp_number"
              type="tel"
              value={form.whatsapp_number ?? ''}
              onChange={(e) => set({ whatsapp_number: e.target.value })}
              placeholder="27821234567"
              className="field"
            />
            <p className="hint">Country code, no plus or spaces — that is what wa.me needs.</p>
          </div>

          <div>
            <label htmlFor="email" className="label">
              Email for new leads
            </label>
            <input
              id="email"
              type="email"
              value={form.email ?? ''}
              onChange={(e) => set({ email: e.target.value })}
              className="field"
            />
            <p className="hint">Every new lead is emailed here.</p>
          </div>

          <div>
            <label htmlFor="service_area" className="label">
              Service area
            </label>
            <input
              id="service_area"
              type="text"
              value={form.service_area ?? ''}
              onChange={(e) => set({ service_area: e.target.value })}
              placeholder="Southern Suburbs & City Bowl"
              className="field"
            />
          </div>
        </div>

        <div className="mt-6">
          <span className="label">Opening hours</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {HOUR_KEYS.map((h) => (
              <div key={h.key}>
                <label htmlFor={`hours-${h.key}`} className="mb-1 block text-xs text-slate-500">
                  {h.label}
                </label>
                <input
                  id={`hours-${h.key}`}
                  type="text"
                  value={form.hours?.[h.key] ?? ''}
                  onChange={(e) => setHour(h.key, e.target.value)}
                  placeholder={h.placeholder}
                  className="field"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="google_review_link" className="label">
            Google review link
          </label>
          <input
            id="google_review_link"
            type="url"
            value={form.google_review_link ?? ''}
            onChange={(e) => set({ google_review_link: e.target.value })}
            placeholder="https://g.page/r/…/review"
            className="field"
          />
          <p className="hint">Shown under your reviews so happy customers can add their own.</p>
        </div>
      </section>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <Spinner className="h-4 w-4" /> : null}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved ? (
          <span className="text-sm font-medium text-emerald-600" role="status">
            Saved — your page is updated ✓
          </span>
        ) : (
          <span className="text-sm text-slate-500">Changes go live as soon as you save.</span>
        )}
      </div>
    </form>
  )
}
