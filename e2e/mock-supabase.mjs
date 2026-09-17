// Stand-in for PostgREST + Storage + Edge Functions, used by the end-to-end
// test. It asserts the requests the app makes are well-formed (correct schema
// header, correct filter syntax) and serves fixtures, so the public data path
// in src/lib/publicApi.js is exercised for real without a live project.
import { createServer } from 'node:http'

const BIZ = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'table-mountain-plumbing',
  name: 'Table Mountain Plumbing',
  tagline: 'Burst pipe? Blocked drain? We are there today.',
  about: 'Family-run plumbers working the Southern Suburbs since 2009.',
  logo_url: null,
  primary_color: '#2F5D7C',
  secondary_color: '#23262B',
  phone: '+27 21 555 0142',
  whatsapp_number: '27825550142',
  email: 'jobs@tmplumbing.co.za',
  service_area: 'Southern Suburbs, City Bowl & Atlantic Seaboard',
  hours: { mon_fri: '07:00 - 17:00', emergency: '24/7 for burst pipes' },
  google_review_link: 'https://g.page/r/example/review',
  active: true,
}

const SERVICES = [
  { id: 'a1000000-0000-4000-8000-000000000001', business_id: BIZ.id, name: 'Burst pipe / emergency leak', description: 'Same-day isolation and repair.', starting_price: 850, active: true, sort_order: 1 },
  { id: 'a1000000-0000-4000-8000-000000000002', business_id: BIZ.id, name: 'Blocked drain clearing', description: 'High-pressure jetting.', starting_price: 650, active: true, sort_order: 2 },
]
const TESTIMONIALS = [
  { id: 'b1', business_id: BIZ.id, customer_name: 'Nandi M., Claremont', quote: 'Arrived within the hour.', rating: 5, active: true, sort_order: 1 },
]
const FAQS = [{ id: 'c1', business_id: BIZ.id, question: 'Do you charge a call-out fee?', answer: 'No call-out fee if you book here.', sort_order: 1 }]
const PHOTOS = []

export const problems = []
export const received = { leads: [] }

function assert(cond, msg) {
  if (!cond) problems.push(msg)
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const send = (code, body) => {
    res.writeHead(code, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    })
    res.end(JSON.stringify(body))
  }

  if (req.method === 'OPTIONS') return send(200, {})

  // The test reads this at the end; without it the assertions above would be
  // collected and never looked at.
  if (url.pathname === '/__problems') {
    return send(200, { problems, leadsReceived: received.leads.length })
  }

  // The server outlives a single run, so the test clears counters up front
  // rather than inheriting state from the previous one.
  if (url.pathname === '/__reset') {
    problems.length = 0
    received.leads.length = 0
    return send(200, { ok: true })
  }

  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.replace('/rest/v1/', '')
    // The app must ask PostgREST for the leadcapture schema explicitly;
    // without this header it would silently read `public`.
    if (req.method === 'GET') {
      assert(
        req.headers['accept-profile'] === 'leadcapture',
        `GET ${table}: missing/wrong Accept-Profile (got ${req.headers['accept-profile']})`,
      )
    }
    assert(Boolean(req.headers.apikey), `${table}: missing apikey header`)

    if (table === 'businesses') {
      const slug = url.searchParams.get('slug')
      const activeOnly = url.searchParams.get('active')
      if (activeOnly) return send(200, [{ slug: BIZ.slug, name: BIZ.name, tagline: BIZ.tagline, primary_color: BIZ.primary_color }])
      if (slug === `eq.${BIZ.slug}`) return send(200, [BIZ])
      return send(200, [])
    }

    const bid = url.searchParams.get('business_id')
    assert(bid === `eq.${BIZ.id}`, `${table}: expected business_id=eq.<id>, got ${bid}`)
    if (table === 'services') return send(200, SERVICES)
    if (table === 'testimonials') return send(200, TESTIMONIALS)
    if (table === 'faqs') return send(200, FAQS)
    if (table === 'work_photos') return send(200, PHOTOS)

    if (table === 'leads' && req.method === 'POST') {
      assert(req.headers['content-profile'] === 'leadcapture', 'POST leads: missing Content-Profile')
      return send(201, {})
    }
    return send(200, [])
  }

  if (url.pathname.includes('/functions/v1/')) {
    let body = ''
    for await (const chunk of req) body += chunk
    const parsed = JSON.parse(body || '{}')
    received.leads.push(parsed)

    assert(parsed.business_slug === BIZ.slug, `function: wrong slug ${parsed.business_slug}`)
    assert(/^27\d{9}$/.test(parsed.phone ?? ''), `function: phone not normalised to E.164 (${parsed.phone})`)

    return send(200, {
      ok: true,
      lead_id: 'dddddddd-0000-4000-8000-00000000000d',
      reference: 'dddddddd',
      notified: { business: true, customer: true },
      business: { name: BIZ.name, phone: BIZ.phone, whatsapp_number: BIZ.whatsapp_number },
    })
  }

  send(404, { error: 'not found' })
})

server.listen(4180, '127.0.0.1', () => console.log('mock supabase on 4180'))

process.on('SIGTERM', () => server.close())
