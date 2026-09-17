import { BUCKET, publicPhotoUrl, supabase } from './supabaseClient'

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
