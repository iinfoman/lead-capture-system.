// Stand-in backend for taking preview screenshots of the whole app, including
// the logged-in side. Separate from mock-supabase.mjs so the verified e2e
// contract test stays untouched.
//
// It fakes just enough of GoTrue and PostgREST for the real client code to run
// unmodified: a password grant that returns a decodable (unsigned) JWT, the
// membership and admin lookups AuthProvider makes, and the dashboard reads.
import { createServer } from 'node:http'

const USER = {
  id: 'bce57258-2421-4772-8520-2606d9448af1',
  email: 'iinfoworks@gmail.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-07-20T00:53:27Z',
}

const b64 = (o) =>
  Buffer.from(JSON.stringify(o)).toString('base64url')
// supabase-js decodes the payload for expiry; it never verifies the signature
// in the browser, so an unsigned token is enough to drive the UI.
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
  sub: USER.id,
  email: USER.email,
  role: 'authenticated',
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
})}.preview-signature-not-verified-client-side`

const PLUMBER = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'table-mountain-plumbing',
  name: 'Table Mountain Plumbing',
  tagline: 'Burst pipe? Blocked drain? We are there today.',
  about:
    'Family-run plumbers working the Southern Suburbs since 2009. Fully insured, upfront pricing, and we clean up before we leave. No call-out fee for quotes booked online.',
  logo_url: null,
  primary_color: '#2F5D7C',
  secondary_color: '#23262B',
  phone: '+27 21 555 0142',
  whatsapp_number: '27825550142',
  email: 'jobs@tmplumbing.co.za',
  service_area: 'Southern Suburbs, City Bowl & Atlantic Seaboard',
  hours: {
    mon_fri: '07:00 - 17:00',
    sat: '08:00 - 13:00',
    sun: 'Emergencies only',
    emergency: '24/7 for burst pipes',
  },
  google_review_link: 'https://g.page/r/example/review',
  active: true,
}

const SPARKS = {
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'atlantic-sparks',
  name: 'Atlantic Sparks Electrical',
  tagline: 'Certified electricians. Load-shedding ready.',
  about: 'Master Electricians registered with the ECA.',
  logo_url: null,
  primary_color: '#A8500B',
  secondary_color: '#1A1D21',
  phone: '+27 21 555 0198',
  whatsapp_number: '27835550198',
  email: 'hello@atlanticsparks.co.za',
  service_area: 'Atlantic Seaboard, CBD & Northern Suburbs',
  hours: { mon_fri: '07:30 - 16:30', emergency: '24/7 electrical faults' },
  google_review_link: null,
  active: true,
}

const tile = (bg, fg, accent, paths) =>
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">${paths}</g><rect x="0" y="576" width="800" height="24" fill="${accent}"/></svg>`,
  ).toString('base64')

const SERVICES = [
  { id: 'a1', business_id: PLUMBER.id, name: 'Burst pipe / emergency leak', description: 'Same-day isolation and repair. We stop the water first, quote second.', starting_price: 850, active: true, sort_order: 1 },
  { id: 'a2', business_id: PLUMBER.id, name: 'Blocked drain clearing', description: 'High-pressure jetting and camera inspection for stubborn blockages.', starting_price: 650, active: true, sort_order: 2 },
  { id: 'a3', business_id: PLUMBER.id, name: 'Geyser repair & replacement', description: 'Repair, replace or relocate. All work comes with a COC certificate.', starting_price: 2400, active: true, sort_order: 3 },
  { id: 'a4', business_id: PLUMBER.id, name: 'Bathroom & kitchen installs', description: 'Taps, mixers, toilets and full renovations.', starting_price: 1200, active: true, sort_order: 4 },
  { id: 'e1', business_id: SPARKS.id, name: 'Inverter & battery install', description: 'Sized to your actual usage, not a sales target.', starting_price: 18500, active: true, sort_order: 1 },
]

const TESTIMONIALS = [
  { id: 'b1', business_id: PLUMBER.id, customer_name: 'Nandi M., Claremont', quote: 'Geyser burst at 6am on a Sunday. They answered, arrived within the hour, and the quote was exactly what they said on the phone.', rating: 5, active: true, sort_order: 1 },
  { id: 'b2', business_id: PLUMBER.id, customer_name: 'Pieter V., Observatory', quote: 'Third plumber I called and the only one who actually showed up when they said they would. Drain has been clear for eight months.', rating: 5, active: true, sort_order: 2 },
  { id: 'b3', business_id: PLUMBER.id, customer_name: 'Fatima S., Rondebosch', quote: 'Neat, polite and they took their shoes off without being asked. Small thing, but it says a lot.', rating: 4, active: true, sort_order: 3 },
]

const FAQS = [
  { id: 'c1', business_id: PLUMBER.id, question: 'Do you charge a call-out fee?', answer: 'No call-out fee if you book the quote through this page. For emergency after-hours work there is a R450 after-hours surcharge, which we tell you before we dispatch.', sort_order: 1 },
  { id: 'c2', business_id: PLUMBER.id, question: 'How fast can you get here?', answer: 'For emergencies in our service area we aim for under 90 minutes. For standard bookings we usually offer a slot the next working day.', sort_order: 2 },
  { id: 'c3', business_id: PLUMBER.id, question: 'Do you issue a COC certificate?', answer: 'Yes. All geyser and plumbing work is issued with a Certificate of Compliance, which your insurer will ask for.', sort_order: 3 },
]

const PHOTOS = [
  { id: 'd1', business_id: PLUMBER.id, caption: 'Full bathroom re-pipe in Newlands', sort_order: 1, image_url: tile('#E3EAF0', '#2F5D7C', '#A8500B', '<path d="M120 380h180v-140h180v200h200"/><circle cx="300" cy="380" r="26"/><circle cx="480" cy="240" r="26"/>') },
  { id: 'd2', business_id: PLUMBER.id, caption: 'Geyser swap-out, Kenilworth', sort_order: 2, image_url: tile('#E3EAF0', '#2F5D7C', '#A8500B', '<rect x="290" y="150" width="220" height="300" rx="110"/><path d="M400 150v-40M330 470v60M470 470v60"/>') },
  { id: 'd3', business_id: PLUMBER.id, caption: 'Outside tap and irrigation line', sort_order: 3, image_url: tile('#E3EAF0', '#2F5D7C', '#A8500B', '<path d="M250 420h300M300 420v-90a100 100 0 0 1 200 0v40"/><path d="M500 370h80"/>') },
]

const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const day = (d) => new Date(Date.now() + d * 86400e3).toISOString().slice(0, 10)

let LEADS = [
  { id: 'l1', business_id: PLUMBER.id, customer_name: 'Sarah Adams', phone: '27825550110', whatsapp: '27825550110', email: 'sarah.adams@example.co.za', service_id: 'a1', location: 'Newlands', urgency: 'emergency', description: 'Pipe burst under the kitchen sink, water everywhere. Mains is off for now.', preferred_contact: 'call', status: 'new', quote_amount: null, follow_up_date: null, notes: null, photo_url: null, created_at: ago(2) },
  { id: 'l2', business_id: PLUMBER.id, customer_name: 'Johan Botha', phone: '27835550121', whatsapp: '27835550121', email: 'jbotha@example.co.za', service_id: 'a2', location: 'Observatory', urgency: 'high', description: 'Shower drains very slowly and smells. Probably roots again.', preferred_contact: 'whatsapp', status: 'contacted', quote_amount: null, follow_up_date: null, notes: 'Called back — available Thursday morning.', photo_url: null, created_at: ago(26) },
  { id: 'l3', business_id: PLUMBER.id, customer_name: 'Lerato Dube', phone: '27845550132', whatsapp: null, email: 'lerato.d@example.co.za', service_id: 'a3', location: 'Rondebosch', urgency: 'medium', description: 'Geyser is 14 years old, want to replace before it fails.', preferred_contact: 'email', status: 'quote_sent', quote_amount: 6800, follow_up_date: day(3), notes: 'Quoted 150L Kwikot incl. COC. Comparing with one other quote.', photo_url: null, created_at: ago(72) },
  { id: 'l4', business_id: PLUMBER.id, customer_name: 'Mark Petersen', phone: '27825550143', whatsapp: '27825550143', email: null, service_id: 'a4', location: 'Claremont', urgency: 'low', description: 'Two leaking mixer taps in the main bathroom.', preferred_contact: 'whatsapp', status: 'booked', quote_amount: 1450, follow_up_date: day(1), notes: 'Booked for Friday 09:00. Parts already ordered.', photo_url: null, created_at: ago(120) },
  { id: 'l5', business_id: PLUMBER.id, customer_name: 'Aisha Khan', phone: '27815550154', whatsapp: null, email: 'aisha.k@example.co.za', service_id: 'a2', location: 'Wynberg', urgency: 'medium', description: 'Outside drain overflowing after the rain.', preferred_contact: 'call', status: 'completed', quote_amount: 950, follow_up_date: null, notes: 'Cleared and jetted. Invoiced and paid.', photo_url: null, created_at: ago(288) },
  { id: 'l6', business_id: PLUMBER.id, customer_name: 'Thabo Nkosi', phone: '27795550165', whatsapp: '27795550165', email: null, service_id: 'a1', location: 'Mowbray', urgency: 'high', description: 'Toilet cistern cracked and leaking onto the floor.', preferred_contact: 'call', status: 'follow_up', quote_amount: 1100, follow_up_date: day(-1), notes: 'Left a voicemail Tuesday. Try again.', photo_url: null, created_at: ago(96) },
  { id: 'l7', business_id: PLUMBER.id, customer_name: 'Gerhard Smit', phone: '27825550176', whatsapp: null, email: 'gsmit@example.co.za', service_id: 'a3', location: 'Plumstead', urgency: 'low', description: 'Wanted a quote but went with a cheaper option.', preferred_contact: 'email', status: 'lost', quote_amount: 5400, follow_up_date: null, notes: 'Price only. Worth a follow-up next year.', photo_url: null, created_at: ago(400) },
  { id: 'l8', business_id: SPARKS.id, customer_name: 'Daniel Fourie', phone: '27825550210', whatsapp: '27825550210', email: 'dfourie@example.co.za', service_id: 'e1', location: 'Sea Point', urgency: 'medium', description: 'Want a quote for an inverter that runs the fridge, wifi and lights.', preferred_contact: 'whatsapp', status: 'new', quote_amount: null, follow_up_date: null, notes: null, photo_url: null, created_at: ago(5) },
]

const svc = (id) => {
  const s = SERVICES.find((x) => x.id === id)
  return s ? { id: s.id, name: s.name } : null
}
const biz = (id) => {
  const b = [PLUMBER, SPARKS].find((x) => x.id === id)
  return b ? { id: b.id, name: b.name, slug: b.slug, primary_color: b.primary_color } : null
}
const hydrate = (l) => ({ ...l, service: svc(l.service_id), business: biz(l.business_id) })

const eqOf = (v) => (v ? String(v).replace(/^eq\./, '') : null)

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const send = (code, body) => {
    res.writeHead(code, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Expose-Headers': 'content-range',
    })
    res.end(JSON.stringify(body))
  }
  if (req.method === 'OPTIONS') return send(200, {})

  let body = ''
  for await (const c of req) body += c
  const json = body ? JSON.parse(body) : {}

  // --- GoTrue ---------------------------------------------------------
  if (url.pathname.startsWith('/auth/v1/')) {
    if (url.pathname.endsWith('/token')) {
      return send(200, {
        access_token: JWT,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'preview-refresh',
        user: USER,
      })
    }
    if (url.pathname.endsWith('/user')) return send(200, USER)
    if (url.pathname.endsWith('/logout')) return send(204, {})
    return send(200, {})
  }

  // --- PostgREST ------------------------------------------------------
  if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.replace('/rest/v1/', '')
    const bid = eqOf(url.searchParams.get('business_id'))
    const id = eqOf(url.searchParams.get('id'))
    const slug = eqOf(url.searchParams.get('slug'))

    if (table === 'businesses') {
      if (slug) return send(200, [PLUMBER, SPARKS].filter((b) => b.slug === slug))
      if (id) return send(200, [PLUMBER, SPARKS].filter((b) => b.id === id))
      return send(200, [PLUMBER, SPARKS])
    }
    if (table === 'business_users') {
      return send(200, [{ id: 'bu1', role: 'owner', business_id: PLUMBER.id, business: PLUMBER }])
    }
    if (table === 'platform_admins') return send(200, [{ user_id: USER.id }])
    if (table === 'services') return send(200, SERVICES.filter((s) => !bid || s.business_id === bid))
    if (table === 'testimonials') return send(200, TESTIMONIALS.filter((t) => !bid || t.business_id === bid))
    if (table === 'faqs') return send(200, FAQS.filter((f) => !bid || f.business_id === bid))
    if (table === 'work_photos') return send(200, PHOTOS.filter((p) => !bid || p.business_id === bid))

    if (table === 'leads') {
      if (req.method === 'PATCH') {
        LEADS = LEADS.map((l) => (l.id === id ? { ...l, ...json } : l))
        return send(200, [hydrate(LEADS.find((l) => l.id === id))])
      }
      if (req.method === 'DELETE') {
        LEADS = LEADS.filter((l) => l.id !== id)
        return send(204, {})
      }
      if (req.method === 'POST') return send(201, {})
      const rows = LEADS.filter((l) => !bid || l.business_id === bid).map(hydrate)
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return send(200, rows)
    }
    return send(200, [])
  }

  if (url.pathname.includes('/functions/v1/')) {
    return send(200, {
      ok: true,
      lead_id: 'preview-lead-0001',
      reference: 'a4f91c22',
      notified: { business: true, customer: true },
      business: { name: PLUMBER.name, phone: PLUMBER.phone, whatsapp_number: PLUMBER.whatsapp_number },
    })
  }

  send(404, { error: 'not found' })
}).listen(4190, '127.0.0.1', () => console.log('preview mock on 4190'))
