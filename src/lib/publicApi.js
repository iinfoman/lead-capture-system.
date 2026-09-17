// ---------------------------------------------------------------------------
// The public landing page's data path — plain fetch against PostgREST and
// Storage, with no @supabase/supabase-js import.
//
// Why this exists rather than reusing the SDK client: the SDK bundles the
// realtime client (which this app never uses) and the auth client (which a
// customer reading a plumber's page never needs). Dropping it roughly halves
// the JavaScript on the one route customers actually load — and in this market
// that download is a real cost on a prepaid bundle, not an abstraction.
//
// Everything behind a login still uses the SDK; see lib/api.js.
//
// The only non-obvious part is `Accept-Profile`. That header is how PostgREST
// is told to read from a non-default schema, and it is exactly what the SDK's
// `db: { schema }` option sets under the hood.
// ---------------------------------------------------------------------------

import {
  BUCKET,
  SCHEMA,
  SUBMIT_LEAD_FUNCTION,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  functionUrl,
  publicPhotoUrl,
} from './config'
import { normalisePhone } from './validation'

export { publicPhotoUrl }

const restHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Accept-Profile': SCHEMA,
  Accept: 'application/json',
}

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: restHeaders })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Database request failed (${res.status}). ${detail}`.trim())
  }
  return res.json()
}

/**
 * One hydration call for everything the landing page renders. All five tables
 * are public-read, so this works for a logged-out visitor.
 */
export async function fetchBusinessBySlug(slug) {
  const [business] = await rest(`businesses?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`)
  if (!business) return null

  const forBusiness = (table, extra = '') =>
    rest(`${table}?business_id=eq.${business.id}&select=*${extra}&order=sort_order.asc`)

  const [services, testimonials, faqs, photos] = await Promise.all([
    forBusiness('services', '&active=is.true'),
    forBusiness('testimonials', '&active=is.true'),
    forBusiness('faqs'),
    forBusiness('work_photos'),
  ])

  return {
    business,
    services,
    testimonials,
    faqs,
    workPhotos: photos.map((p) => ({ ...p, image_url: publicPhotoUrl(p.image_url) })),
  }
}

/** Businesses listed on the root signpost page. */
export async function fetchActiveBusinesses() {
  return rest('businesses?active=is.true&select=slug,name,tagline,primary_color&order=name.asc')
}

/** Upload a lead photo into <business_id>/leads/, which anon may write to. */
export async function uploadLeadPhoto(businessId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${businessId}/leads/${crypto.randomUUID()}.${ext}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'Cache-Control': '3600',
      'x-upsert': 'false',
    },
    body: file,
  })

  if (!res.ok) {
    throw new Error(`Photo upload failed (${res.status}).`)
  }
  return publicPhotoUrl(path)
}

/**
 * Submit a lead.
 *
 * The Edge Function is the real path — it validates server-side, rate-limits
 * and sends both emails. If it is unreachable (typically: not deployed yet)
 * we fall back to a direct insert, which the "public insert leads" RLS policy
 * permits. The fallback saves the lead but cannot send email, so it reports
 * `notified: false` and the confirmation screen says so.
 */
export async function submitLead(payload) {
  const body = {
    ...payload,
    phone: normalisePhone(payload.phone) ?? payload.phone,
    whatsapp: payload.whatsapp ? normalisePhone(payload.whatsapp) : null,
  }

  let res
  try {
    res = await fetch(functionUrl(SUBMIT_LEAD_FUNCTION), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    })
  } catch (networkError) {
    // Only a transport-level failure reaches here, which means the function is
    // not deployed or not reachable. Any HTTP response — including a 500 — is
    // a real answer and is handled below, never retried against the database.
    console.warn('[leadcapture] Edge Function unreachable, inserting directly:', networkError.message)
    return submitLeadDirect(body)
  }

  const json = await res.json().catch(() => ({}))

  if (res.ok) return json

  if (res.status === 422) {
    const err = new Error('validation_failed')
    err.fields = json.fields ?? {}
    throw err
  }
  if (res.status === 429) {
    const err = new Error(json.error ?? 'Too many requests. Please try again shortly.')
    err.rateLimited = true
    throw err
  }
  throw new Error(json.error ?? 'We could not send your request. Please try again.')
}

/**
 * Fallback used only when the Edge Function is unreachable.
 *
 * Note the deliberate lack of a `Prefer: return=representation` header: under
 * RLS an INSERT ... RETURNING also needs a SELECT policy, and anon has none on
 * `leads` by design. So the id is generated here and sent with the row rather
 * than read back.
 */
async function submitLeadDirect(body) {
  // company_website is the honeypot — never persisted.
  const { business_slug, company_website: _honeypot, ...rest_ } = body

  const [business] = await rest(
    `businesses?slug=eq.${encodeURIComponent(business_slug)}&select=id,name,phone,whatsapp_number&limit=1`,
  ).catch(() => [])

  if (!business) throw new Error('We could not find that business.')

  const id = crypto.randomUUID()

  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Profile': SCHEMA,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...rest_, id, business_id: business.id, status: 'new' }),
  })

  if (!res.ok) {
    console.error('[leadcapture] direct insert failed', res.status, await res.text().catch(() => ''))
    throw new Error('We could not save your request. Please try again.')
  }

  return {
    ok: true,
    lead_id: id,
    reference: id.slice(0, 8),
    // No Edge Function means no Resend call, so nobody was emailed. The
    // confirmation screen tells the customer the truth about that.
    notified: { business: false, customer: false },
    business: {
      name: business.name,
      phone: business.phone,
      whatsapp_number: business.whatsapp_number,
    },
  }
}
