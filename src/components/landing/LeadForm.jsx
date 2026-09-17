import { useEffect, useMemo, useRef, useState } from 'react'
import { useBusinessConfig } from '../../context/BusinessConfigProvider'
import { submitLead, uploadLeadPhoto } from '../../lib/publicApi'
import { CONTACT_OPTIONS, URGENCY_OPTIONS } from '../../lib/constants'
import { validatePhotoFile, validateStep } from '../../lib/validation'
import ServiceSelector from './ServiceSelector'
import Spinner from '../common/Spinner'

const STEPS = [
  { key: 'service', title: 'What do you need?', caption: 'Pick the closest match.' },
  { key: 'details', title: 'Tell us about it', caption: 'A sentence or two is plenty.' },
  { key: 'contact', title: 'How do we reach you?', caption: 'We only use this to reply.' },
]

const EMPTY_FORM = {
  service_id: '',
  description: '',
  urgency: 'medium',
  location: '',
  customer_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  preferred_contact: 'call',
  company_website: '', // honeypot
}

export default function LeadForm({ onSubmitted }) {
  const { business, services } = useBusinessConfig()
  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoError, setPhotoError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const headingRef = useRef(null)
  const fileInputRef = useRef(null)

  // Object URLs have to be revoked by hand; creating one inline in the JSX
  // would leak a new blob on every keystroke that re-renders the form.
  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(photo)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const step = STEPS[stepIndex]
  const selectedService = useMemo(
    () => services.find((s) => s.id === form.service_id) ?? null,
    [services, form.service_id],
  )

  // The prompt adapts to whichever service was picked, so the form reads like
  // it was written for that job rather than being one generic textarea.
  const descriptionPrompt = selectedService
    ? `What is happening with your ${selectedService.name.toLowerCase()}?`
    : 'What do you need help with?'

  const descriptionPlaceholder = selectedService?.description
    ? `e.g. ${selectedService.description}`
    : 'e.g. Kitchen tap has been dripping for a week and is getting worse.'

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }))
    setErrors((e) => {
      const next = { ...e }
      Object.keys(patch).forEach((k) => delete next[k])
      return next
    })
  }

  function focusHeading() {
    // Move focus with the step so screen readers and keyboard users follow
    // along instead of being left at the bottom of the previous step.
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function next() {
    const stepErrors = validateStep(step.key, form)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    focusHeading()
  }

  function back() {
    setSubmitError(null)
    setStepIndex((i) => Math.max(i - 1, 0))
    focusHeading()
  }

  function onPhotoChange(event) {
    const file = event.target.files?.[0] ?? null
    const problem = validatePhotoFile(file)
    setPhotoError(problem)
    setPhoto(problem ? null : file)
  }

  function clearPhoto() {
    setPhoto(null)
    setPhotoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const stepErrors = validateStep('contact', form)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      // Upload first: if storage is unhappy we would rather fail before the
      // lead exists than leave a lead pointing at a photo that never landed.
      let photo_url = null
      if (photo) {
        try {
          photo_url = await uploadLeadPhoto(business.id, photo)
        } catch (err) {
          console.warn('[leadcapture] photo upload failed, submitting without it', err)
        }
      }

      const result = await submitLead({
        business_slug: business.slug,
        service_id: form.service_id || null,
        customer_name: form.customer_name,
        phone: form.phone,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        location: form.location || null,
        urgency: form.urgency,
        description: form.description,
        preferred_contact: form.preferred_contact,
        photo_url,
        company_website: form.company_website,
      })

      onSubmitted({ ...result, service: selectedService, form })
    } catch (err) {
      if (err.fields) {
        setErrors(err.fields)
        // Send the customer back to the step that owns the failing field.
        if (err.fields.service_id) setStepIndex(0)
        else if (err.fields.description || err.fields.urgency) setStepIndex(1)
        else setStepIndex(2)
        focusHeading()
      } else {
        setSubmitError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="quote" className="section scroll-mt-6 py-14" aria-labelledby="quote-heading">
      <div className="card overflow-hidden">
        <div
          className="px-6 py-6 sm:px-9 sm:py-7"
          style={{ background: 'var(--brand-primary-soft)' }}
        >
          <h2 id="quote-heading" className="text-2xl font-bold tracking-tight text-slate-900">
            Get your free quote
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Three quick steps. No obligation, and we never share your details.
          </p>

          <ol className="mt-6 flex items-center gap-2" aria-label="Progress">
            {STEPS.map((s, i) => {
              const done = i < stepIndex
              const active = i === stepIndex
              return (
                <li key={s.key} className="flex flex-1 items-center gap-2">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                      active || done ? 'text-white' : 'bg-white text-slate-500 ring-1 ring-slate-300'
                    }`}
                    style={active || done ? { background: 'var(--brand-primary)' } : undefined}
                    aria-current={active ? 'step' : undefined}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span
                      className="h-1 flex-1 rounded-full transition-all"
                      style={{
                        background: done ? 'var(--brand-primary)' : 'rgba(15,23,42,0.12)',
                      }}
                      aria-hidden="true"
                    />
                  ) : null}
                </li>
              )
            })}
          </ol>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-7 sm:px-9 sm:py-8">
          <h3
            ref={headingRef}
            tabIndex={-1}
            className="text-lg font-bold text-slate-900 outline-none"
          >
            {step.title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{step.caption}</p>

          <div className="mt-6 animate-slide-up">
            {step.key === 'service' ? (
              <ServiceSelector
                value={form.service_id}
                onChange={(id) => update({ service_id: id })}
                error={errors.service_id}
              />
            ) : null}

            {step.key === 'details' ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="description" className="label">
                    {descriptionPrompt}
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder={descriptionPlaceholder}
                    className={`field resize-y ${errors.description ? 'field-error' : ''}`}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? 'description-error' : undefined}
                  />
                  {errors.description ? (
                    <p id="description-error" className="error-text">
                      <span aria-hidden="true">•</span> {errors.description}
                    </p>
                  ) : null}
                </div>

                <fieldset>
                  <legend className="label">How soon do you need us?</legend>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {URGENCY_OPTIONS.map((option) => {
                      const selected = form.urgency === option.value
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition ${
                            selected
                              ? ''
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                          style={
                            selected
                              ? {
                                  borderColor: 'var(--brand-primary)',
                                  background: 'var(--brand-primary-soft)',
                                }
                              : undefined
                          }
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value={option.value}
                            checked={selected}
                            onChange={() => update({ urgency: option.value })}
                            className="mt-1 h-4 w-4 accent-[var(--brand-primary)]"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">
                              {option.label}
                            </span>
                            <span className="block text-xs text-slate-500">{option.hint}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {errors.urgency ? (
                    <p className="error-text">
                      <span aria-hidden="true">•</span> {errors.urgency}
                    </p>
                  ) : null}
                </fieldset>

                <div>
                  <label htmlFor="location" className="label">
                    Suburb or area <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="location"
                    type="text"
                    value={form.location}
                    onChange={(e) => update({ location: e.target.value })}
                    placeholder="e.g. Rondebosch"
                    className="field"
                    autoComplete="address-level2"
                  />
                  {business.service_area ? (
                    <p className="hint">We cover {business.service_area}.</p>
                  ) : null}
                </div>

                <div>
                  <span className="label">
                    Photo <span className="font-normal text-slate-500">(optional, helps a lot)</span>
                  </span>

                  {photo ? (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{photo.name}</p>
                        <p className="text-xs text-slate-500">
                          {(photo.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button type="button" onClick={clearPhoto} className="btn btn-ghost text-xs">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center transition hover:border-slate-400 hover:bg-slate-50">
                      <span className="text-xl" aria-hidden="true">
                        📷
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        Add a photo of the problem
                      </span>
                      <span className="text-xs text-slate-500">JPG, PNG or WEBP · up to 5MB</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        onChange={onPhotoChange}
                        className="sr-only"
                      />
                    </label>
                  )}

                  {photoError ? (
                    <p className="error-text">
                      <span aria-hidden="true">•</span> {photoError}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step.key === 'contact' ? (
              <div className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="customer_name" className="label">
                      Your name
                    </label>
                    <input
                      id="customer_name"
                      type="text"
                      value={form.customer_name}
                      onChange={(e) => update({ customer_name: e.target.value })}
                      className={`field ${errors.customer_name ? 'field-error' : ''}`}
                      autoComplete="name"
                      aria-invalid={Boolean(errors.customer_name)}
                    />
                    {errors.customer_name ? (
                      <p className="error-text">
                        <span aria-hidden="true">•</span> {errors.customer_name}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="phone" className="label">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={(e) => update({ phone: e.target.value })}
                      placeholder="082 123 4567"
                      className={`field ${errors.phone ? 'field-error' : ''}`}
                      autoComplete="tel"
                      aria-invalid={Boolean(errors.phone)}
                    />
                    {errors.phone ? (
                      <p className="error-text">
                        <span aria-hidden="true">•</span> {errors.phone}
                      </p>
                    ) : null}
                  </div>
                </div>

                <fieldset>
                  <legend className="label">How should we get back to you?</legend>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {CONTACT_OPTIONS.map((option) => {
                      const selected = form.preferred_contact === option.value
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-3.5 transition ${
                            selected ? '' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                          style={
                            selected
                              ? {
                                  borderColor: 'var(--brand-primary)',
                                  background: 'var(--brand-primary-soft)',
                                }
                              : undefined
                          }
                        >
                          <input
                            type="radio"
                            name="preferred_contact"
                            value={option.value}
                            checked={selected}
                            onChange={() => update({ preferred_contact: option.value })}
                            className="h-4 w-4 accent-[var(--brand-primary)]"
                          />
                          <span className="text-sm font-semibold text-slate-900">
                            <span aria-hidden="true">{option.icon}</span> {option.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="whatsapp" className="label">
                      WhatsApp number{' '}
                      <span className="font-normal text-slate-500">
                        {form.preferred_contact === 'whatsapp' ? '(or we use your phone number)' : '(optional)'}
                      </span>
                    </label>
                    <input
                      id="whatsapp"
                      type="tel"
                      inputMode="tel"
                      value={form.whatsapp}
                      onChange={(e) => update({ whatsapp: e.target.value })}
                      placeholder="Same as phone"
                      className={`field ${errors.whatsapp ? 'field-error' : ''}`}
                      aria-invalid={Boolean(errors.whatsapp)}
                    />
                    {errors.whatsapp ? (
                      <p className="error-text">
                        <span aria-hidden="true">•</span> {errors.whatsapp}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label htmlFor="email" className="label">
                      Email{' '}
                      <span className="font-normal text-slate-500">
                        {form.preferred_contact === 'email' ? '' : '(optional — for your confirmation)'}
                      </span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update({ email: e.target.value })}
                      placeholder="you@example.co.za"
                      className={`field ${errors.email ? 'field-error' : ''}`}
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email ? (
                      <p className="error-text">
                        <span aria-hidden="true">•</span> {errors.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Honeypot. Hidden from people, irresistible to bots. */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company_website">Do not fill this in</label>
                  <input
                    id="company_website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company_website}
                    onChange={(e) => update({ company_website: e.target.value })}
                  />
                </div>

                {submitError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                  >
                    {submitError}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
            {stepIndex > 0 ? (
              <button type="button" onClick={back} className="btn btn-ghost">
                ← Back
              </button>
            ) : (
              <span />
            )}

            {stepIndex < STEPS.length - 1 ? (
              <button type="button" onClick={next} className="btn btn-primary px-6">
                Continue →
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn btn-primary px-6">
                {submitting ? <Spinner className="h-4 w-4" /> : null}
                {submitting ? 'Sending…' : 'Send my request'}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
