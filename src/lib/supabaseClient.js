import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This app is a guest in the shared Ovibe project, so every query is pinned to
// the `leadcapture` schema. The schema must also be listed under
// Settings -> API -> Exposed schemas or PostgREST will refuse the request.
export const SCHEMA = import.meta.env.VITE_SUPABASE_SCHEMA || 'leadcapture'
export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'leadcapture-photos'
export const SUBMIT_LEAD_FUNCTION =
  import.meta.env.VITE_SUBMIT_LEAD_FUNCTION || 'leadcapture-submit-lead'

export const isConfigured = Boolean(url && anonKey)

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    '[leadcapture] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'anon', {
  db: { schema: SCHEMA },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'leadcapture-auth',
  },
})

/** Public URL for an object in the app's storage bucket. */
export function publicPhotoUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

/** Base URL of the deployed Edge Functions for this project. */
export function functionUrl(name) {
  return `${url}/functions/v1/${name}`
}
