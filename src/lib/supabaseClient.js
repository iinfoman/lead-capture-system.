import { createClient } from '@supabase/supabase-js'
import { SCHEMA, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

// The SDK client, used only by routes behind a login. The public landing page
// talks to PostgREST directly through lib/publicApi.js so that this import —
// and the realtime and auth clients it drags in — never reaches a customer's
// phone. See the header comment in publicApi.js.
export const supabase = createClient(
  SUPABASE_URL ?? 'http://localhost',
  SUPABASE_ANON_KEY ?? 'anon',
  {
    db: { schema: SCHEMA },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'leadcapture-auth',
    },
  },
)

export { BUCKET, SCHEMA, SUBMIT_LEAD_FUNCTION, functionUrl, isConfigured, publicPhotoUrl } from './config'
