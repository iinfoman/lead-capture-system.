// Allowed origins are configured per deployment. Set LEAD_ALLOWED_ORIGINS to a
// comma-separated list (e.g. your Netlify domain + custom domain). If it is
// unset we fall back to "*", which is fine for a public, unauthenticated
// endpoint but worth tightening once the production domain is known.
const configured = (Deno.env.get('LEAD_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow =
    configured.length === 0 ? '*' : configured.includes(origin) ? origin : configured[0]

  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}
