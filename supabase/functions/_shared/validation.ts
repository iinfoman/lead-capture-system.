// Server-side validation. The browser runs the same rules for fast feedback
// (src/lib/validation.js), but this is the copy that actually decides — the
// client one is a convenience and can be bypassed.

export const URGENCY = ['low', 'medium', 'high', 'emergency'] as const
export const PREFERRED_CONTACT = ['call', 'whatsapp', 'email'] as const

export type LeadInput = {
  business_slug?: string
  business_id?: string
  customer_name?: string
  phone?: string
  whatsapp?: string
  email?: string
  service_id?: string | null
  location?: string
  urgency?: string
  description?: string
  photo_url?: string | null
  preferred_contact?: string
  // Honeypot: a real person never fills this, bots fill everything.
  company_website?: string
}

export type ValidationResult =
  | { ok: true; value: Required<Pick<LeadInput, 'customer_name' | 'phone'>> & Record<string, unknown> }
  | { ok: false; errors: Record<string, string> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Normalise a South African number to E.164 digits (27XXXXXXXXX).
 * Accepts 082 123 4567, +27 82 123 4567, 0027821234567, 27821234567.
 * Returns null if it cannot be read as a valid SA mobile/landline.
 */
export function normalisePhone(raw: string): string | null {
  const digits = (raw ?? '').replace(/[^\d+]/g, '').replace(/^\+/, '')
  let n = digits
  if (n.startsWith('0027')) n = n.slice(4)
  else if (n.startsWith('27')) n = n.slice(2)
  else if (n.startsWith('0')) n = n.slice(1)
  else return null

  // SA subscriber numbers are 9 digits and never start with 0.
  if (!/^[1-8]\d{8}$/.test(n)) return null
  return `27${n}`
}

export function formatPhoneLocal(e164: string): string {
  const n = e164.replace(/^27/, '')
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`
}

function trim(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max)
}

export function validateLead(input: LeadInput): ValidationResult {
  const errors: Record<string, string> = {}

  // Honeypot — report success upstream, but the caller drops the row.
  if (trim(input.company_website, 200)) {
    return { ok: false, errors: { _spam: 'rejected' } }
  }

  const customer_name = trim(input.customer_name, 120)
  if (customer_name.length < 2) {
    errors.customer_name = 'Please enter your name.'
  }

  const phone = normalisePhone(trim(input.phone, 30))
  if (!phone) {
    errors.phone = 'Enter a valid South African number, e.g. 082 123 4567.'
  }

  const rawWhatsapp = trim(input.whatsapp, 30)
  let whatsapp: string | null = null
  if (rawWhatsapp) {
    whatsapp = normalisePhone(rawWhatsapp)
    if (!whatsapp) errors.whatsapp = 'That WhatsApp number does not look right.'
  }

  const rawEmail = trim(input.email, 200).toLowerCase()
  let email: string | null = null
  if (rawEmail) {
    if (!EMAIL_RE.test(rawEmail)) errors.email = 'That email address does not look right.'
    else email = rawEmail
  }

  const service_id = trim(input.service_id, 40) || null
  if (service_id && !UUID_RE.test(service_id)) {
    errors.service_id = 'Unknown service.'
  }

  const urgency = trim(input.urgency, 20) || 'medium'
  if (!URGENCY.includes(urgency as (typeof URGENCY)[number])) {
    errors.urgency = 'Pick how urgent this is.'
  }

  const preferred_contact = trim(input.preferred_contact, 20) || 'call'
  if (!PREFERRED_CONTACT.includes(preferred_contact as (typeof PREFERRED_CONTACT)[number])) {
    errors.preferred_contact = 'Pick how you would like to be contacted.'
  }

  if (preferred_contact === 'email' && !email) {
    errors.email = 'We need an email address to reply by email.'
  }
  if (preferred_contact === 'whatsapp' && !whatsapp && !phone) {
    errors.whatsapp = 'We need a WhatsApp number to reply on WhatsApp.'
  }

  const description = trim(input.description, 2000)
  if (description.length < 5) {
    errors.description = 'Tell us a little about the job.'
  }

  const photo_url = trim(input.photo_url, 500) || null
  if (photo_url && !/^https:\/\//i.test(photo_url)) {
    errors.photo_url = 'Invalid photo reference.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      customer_name,
      phone: phone as string,
      whatsapp: whatsapp ?? (preferred_contact === 'whatsapp' ? phone : null),
      email,
      service_id,
      location: trim(input.location, 200) || null,
      urgency,
      description,
      photo_url,
      preferred_contact,
    },
  }
}
