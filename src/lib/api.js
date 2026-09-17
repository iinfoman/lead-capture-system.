import {
  BUCKET,
  SUBMIT_LEAD_FUNCTION,
  functionUrl,
  publicPhotoUrl,
  supabase,
} from './supabaseClient'
import { normalisePhone } from './validation'

// ---------------------------------------------------------------------------
// Public landing page
// ---------------------------------------------------------------------------

/**
 * One round trip for everything the landing page renders. All five tables are
 * public-read, so this works for a logged-out visitor.
 */
export async function fetchBusinessBySlug(slug) {
  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!business) return null

  const [services, testimonials, faqs, photos] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('testimonials')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('sort_order'),
    supabase.from('faqs').select('*').eq('business_id', business.id).order('sort_order'),
    supabase.from('work_photos').select('*').eq('business_id', business.id).order('sort_order'),
  ])

  return {
    business,
    services: services.data ?? [],
    testimonials: testimonials.data ?? [],
    faqs: faqs.data ?? [],
    workPhotos: (photos.data ?? []).map((p) => ({
      ...p,
      image_url: publicPhotoUrl(p.image_url),
    })),
  }
}

/** Upload a lead photo into <business_id>/leads/. Anon uploads are allowed there. */
export async function uploadLeadPhoto(businessId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${businessId}/leads/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

  if (error) throw error
  return publicPhotoUrl(path)
}

/**
 * Submit a lead.
 *
 * The Edge Function is the real path — it validates server-side, rate-limits
 * and sends both emails. If it is unreachable (typically: not deployed yet in
 * a fresh environment) we fall back to a direct insert, which the
 * "public insert leads" RLS policy permits. The fallback saves the lead but
 * cannot send email, so it reports `notified: false` and the caller says so.
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
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''}`,
      },
      body: JSON.stringify(body),
    })
  } catch (networkError) {
    // Only a transport-level failure reaches here, which means the function is
    // not deployed or not reachable. Any HTTP response — including a 500 — is
    // a real answer from the function and is handled below, never retried
    // against the database.
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
 * Fallback path used only when the Edge Function is unreachable. Permitted by
 * the "public insert leads" RLS policy.
 *
 * Note the deliberate lack of `.select()`: under RLS an INSERT ... RETURNING
 * also needs a SELECT policy, and anon has none on `leads` by design. So the
 * id is generated here and sent with the row rather than read back.
 */
async function submitLeadDirect(body) {
  // company_website is the honeypot — never persisted.
  const { business_slug, company_website: _honeypot, ...rest } = body

  const { data: business, error: lookupError } = await supabase
    .from('businesses')
    .select('id, name, phone, whatsapp_number')
    .eq('slug', business_slug)
    .maybeSingle()

  if (lookupError || !business) throw new Error('We could not find that business.')

  const id = crypto.randomUUID()

  const { error } = await supabase
    .from('leads')
    .insert({ ...rest, id, business_id: business.id, status: 'new' })

  if (error) {
    console.error('[leadcapture] direct insert failed', error)
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

// ---------------------------------------------------------------------------
// Dashboard — every query below is RLS-scoped to the caller's business(es)
// ---------------------------------------------------------------------------

const LEAD_SELECT = '*, service:services(id, name)'

export async function fetchMemberships(userId) {
  const { data, error } = await supabase
    .from('business_users')
    .select('id, role, business_id, business:businesses(*)')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function checkPlatformAdmin(userId) {
  const { data, error } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return false
  return Boolean(data)
}

export async function fetchLeads(businessId) {
  let query = supabase.from('leads').select(LEAD_SELECT).order('created_at', { ascending: false })
  if (businessId) query = query.eq('business_id', businessId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchLead(id) {
  const { data, error } = await supabase.from('leads').select(LEAD_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function updateLead(id, patch) {
  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', id)
    .select(LEAD_SELECT)
    .single()

  if (error) throw error
  return data
}

export async function deleteLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function updateBusiness(id, patch) {
  const { data, error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function fetchChildRows(table, businessId) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function upsertChildRow(table, row) {
  const { data, error } = await supabase.from(table).upsert(row).select().single()
  if (error) throw error
  return data
}

export async function deleteChildRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

/** Owner-side upload (logo, work photos) into <business_id>/<folder>/. */
export async function uploadBusinessImage(businessId, folder, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)
  const path = `${businessId}/${folder}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })

  if (error) throw error
  return publicPhotoUrl(path)
}

// ---------------------------------------------------------------------------
// Master admin — cross-tenant. Only returns rows because of the stacked
// "platform admin" RLS policies; a normal owner calling this sees only theirs.
// ---------------------------------------------------------------------------

export async function fetchAllBusinesses() {
  const { data, error } = await supabase.from('businesses').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function fetchAllLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*, service:services(id, name), business:businesses(id, name, slug, primary_color)')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error
  return data ?? []
}
