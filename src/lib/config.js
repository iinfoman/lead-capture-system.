// Environment values shared by both data paths. Deliberately free of any
// import from @supabase/supabase-js, so the public landing page can use these
// without pulling the SDK (and its realtime and auth clients) into its bundle.

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// This app is a guest in the shared Ovibe project, so every request is pinned
// to the `leadcapture` schema. It must also be listed under
// Settings -> API -> Exposed schemas or PostgREST will refuse the request.
export const SCHEMA = import.meta.env.VITE_SUPABASE_SCHEMA || 'leadcapture'
export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'leadcapture-photos'
export const SUBMIT_LEAD_FUNCTION =
  import.meta.env.VITE_SUBMIT_LEAD_FUNCTION || 'leadcapture-submit-lead'

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    '[leadcapture] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in.',
  )
}

/** Public URL for an object in the app's storage bucket. */
export function publicPhotoUrl(path) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  if (/^data:/i.test(path)) return path
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

/** Base URL of a deployed Edge Function in this project. */
export function functionUrl(name) {
  return `${SUPABASE_URL}/functions/v1/${name}`
}
