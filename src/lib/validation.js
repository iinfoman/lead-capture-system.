// Mirrors supabase/functions/_shared/validation.ts. This copy exists purely to
// give the customer instant feedback; the Edge Function is the one that
// decides. Keep the two in step when the rules change.

import { ACCEPTED_IMAGE_TYPES, MAX_PHOTO_BYTES } from './constants'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Normalise a SA number to E.164 digits (27XXXXXXXXX), or null if invalid. */
export function normalisePhone(raw) {
  const digits = String(raw ?? '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '')
  let n = digits
  if (n.startsWith('0027')) n = n.slice(4)
  else if (n.startsWith('27')) n = n.slice(2)
  else if (n.startsWith('0')) n = n.slice(1)
  else return null

  if (!/^[1-8]\d{8}$/.test(n)) return null
  return `27${n}`
}

/** 27821234567 -> 082 123 4567 */
export function formatPhoneLocal(value) {
  const e164 = normalisePhone(value)
  if (!e164) return value ?? ''
  const n = e164.slice(2)
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`
}

export function validateStep(step, form) {
  const errors = {}

  if (step === 'service') {
    if (!form.service_id) errors.service_id = 'Pick the service you need.'
  }

  if (step === 'details') {
    if (!form.description || form.description.trim().length < 5) {
      errors.description = 'A sentence or two is plenty — what is going on?'
    }
    if (!form.urgency) errors.urgency = 'How soon do you need us?'
  }

  if (step === 'contact') {
    if (!form.customer_name || form.customer_name.trim().length < 2) {
      errors.customer_name = 'Please enter your name.'
    }
    if (!normalisePhone(form.phone)) {
      errors.phone = 'Enter a valid SA number, e.g. 082 123 4567.'
    }
    if (form.whatsapp && !normalisePhone(form.whatsapp)) {
      errors.whatsapp = 'That WhatsApp number does not look right.'
    }
    if (form.email && !EMAIL_RE.test(form.email.trim())) {
      errors.email = 'That email address does not look right.'
    }
    if (form.preferred_contact === 'email' && !form.email) {
      errors.email = 'We need an email address to reply by email.'
    }
  }

  return errors
}

export function validatePhotoFile(file) {
  if (!file) return null
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please use a JPG, PNG or WEBP image.'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'That photo is larger than 5MB — try a smaller one.'
  }
  return null
}
