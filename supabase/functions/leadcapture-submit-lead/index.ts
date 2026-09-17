// ---------------------------------------------------------------------------
// leadcapture-submit-lead
//
// The single trigger point for a new lead, exactly as the spec asks: validate
// -> rate-limit -> insert -> notify. Every future automation (WhatsApp API,
// Sheets sync, Make.com webhook) hangs off the `dispatchNotifications` step
// below rather than needing a schema change.
//
// Deploy:  supabase functions deploy leadcapture-submit-lead --no-verify-jwt
// Secrets: supabase secrets set RESEND_API_KEY=... RESEND_FROM=... \
//            LEAD_IP_SALT=... APP_BASE_URL=https://yourapp.netlify.app
// ---------------------------------------------------------------------------

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'
import { validateLead } from '../_shared/validation.ts'
import { confirmToCustomer, notifyBusiness } from '../_shared/email.ts'

const RATE_LIMIT_PER_HOUR = Number(Deno.env.get('LEAD_RATE_LIMIT_PER_HOUR') ?? '8')
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? ''

// Service-role client: this function is the trusted path, so it bypasses RLS
// on purpose. The key only ever exists here, never in the browser bundle.
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { db: { schema: 'leadcapture' }, auth: { persistSession: false } },
)

/** Salted SHA-256 of the caller IP. We rate-limit on it but never store it. */
async function hashIp(req: Request): Promise<string> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown'
  const salt = Deno.env.get('LEAD_IP_SALT') ?? 'leadcapture-default-salt'
  const bytes = new TextEncoder().encode(`${salt}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function isRateLimited(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await admin
    .from('lead_submission_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since)

  // Fail open: a broken counter must not block real customers from reaching a
  // business. The honeypot and validation still stand in the way of bots.
  if (error) {
    console.error('rate limit check failed', error.message)
    return false
  }
  return (count ?? 0) >= RATE_LIMIT_PER_HOUR
}

/**
 * Fan-out point for everything that should happen after a lead lands.
 * Phase 2/3 work (WhatsApp Business API, Sheets, Make.com) adds a promise to
 * this array — the insert path above never has to change.
 */
async function dispatchNotifications(business: any, lead: any, serviceName: string | null) {
  const dashboardUrl = APP_BASE_URL ? `${APP_BASE_URL}/dashboard/leads/${lead.id}` : '#'

  const [toBusiness, toCustomer] = await Promise.all([
    notifyBusiness(business, lead, serviceName, dashboardUrl),
    confirmToCustomer(business, lead, serviceName),
  ])

  if (!toBusiness.sent) console.error('business notify failed:', toBusiness.error)
  if (!toCustomer.sent) console.warn('customer confirm not sent:', toCustomer.error)

  return { business: toBusiness.sent, customer: toCustomer.sent }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405)
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json(req, { error: 'Invalid JSON body' }, 400)
  }

  const validation = validateLead(payload)
  if (!validation.ok) {
    // A tripped honeypot gets a 200 with no row written. Telling a bot it was
    // detected just teaches whoever wrote it to try again differently.
    if (validation.errors._spam) {
      return json(req, { ok: true, lead_id: null })
    }
    return json(req, { error: 'validation_failed', fields: validation.errors }, 422)
  }

  // Resolve the tenant. Slug is what the public page knows about.
  const slug = String(payload.business_slug ?? '').trim()
  const businessId = String(payload.business_id ?? '').trim()
  if (!slug && !businessId) {
    return json(req, { error: 'Missing business reference' }, 400)
  }

  const lookup = admin
    .from('businesses')
    .select('id, slug, name, email, phone, whatsapp_number, primary_color, active')
    .limit(1)

  const { data: business, error: businessError } = await (
    slug ? lookup.eq('slug', slug) : lookup.eq('id', businessId)
  ).maybeSingle()

  if (businessError) {
    console.error('business lookup failed', businessError.message)
    return json(req, { error: 'Could not reach the database. Please try again.' }, 503)
  }
  if (!business || !business.active) {
    return json(req, { error: 'This business is not accepting enquiries right now.' }, 404)
  }

  const ipHash = await hashIp(req)
  if (await isRateLimited(ipHash)) {
    await admin
      .from('lead_submission_log')
      .insert({ ip_hash: ipHash, business_id: business.id, accepted: false })
    return json(
      req,
      {
        error:
          'That is a lot of requests from one place. Give it a few minutes, or ' +
          'call us directly if it is urgent.',
      },
      429,
    )
  }

  // The service the customer picked must belong to this tenant — otherwise a
  // crafted request could stitch another business's service onto this lead.
  let serviceName: string | null = null
  if (validation.value.service_id) {
    const { data: service } = await admin
      .from('services')
      .select('id, name')
      .eq('id', validation.value.service_id)
      .eq('business_id', business.id)
      .maybeSingle()

    if (!service) {
      return json(
        req,
        { error: 'validation_failed', fields: { service_id: 'Unknown service.' } },
        422,
      )
    }
    serviceName = service.name
  }

  const { data: lead, error: insertError } = await admin
    .from('leads')
    .insert({
      ...validation.value,
      business_id: business.id,
      status: 'new',
      source: 'landing_page',
    })
    .select()
    .single()

  if (insertError) {
    console.error('lead insert failed', insertError.message)
    return json(req, { error: 'We could not save your request. Please try again.' }, 500)
  }

  await admin
    .from('lead_submission_log')
    .insert({ ip_hash: ipHash, business_id: business.id, accepted: true })

  // The lead is saved at this point. Notification problems are reported, never
  // fatal — the customer should not retype their details because of Resend.
  const notified = await dispatchNotifications(business, lead, serviceName)

  return json(req, {
    ok: true,
    lead_id: lead.id,
    reference: lead.id.slice(0, 8),
    notified,
    business: {
      name: business.name,
      phone: business.phone,
      whatsapp_number: business.whatsapp_number,
      google_review_link: null,
    },
  })
})
