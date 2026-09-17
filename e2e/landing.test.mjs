// End-to-end test of the customer journey on the public landing page, driven
// in a real browser against the mock in mock-supabase.mjs. This is the path a
// paying customer takes, and the one that uses the SDK-free data layer.
// run.sh resolves these; the fallbacks keep the file runnable on its own.
const PW_ENTRY = process.env.PW_ENTRY || 'playwright'
const { chromium } = await import(PW_ENTRY)

const BASE = 'http://127.0.0.1:4173'
const results = []
const check = (ok, label, detail = '') => {
  results.push({ ok, label, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail && !ok ? '  -- ' + detail : ''}`)
}

await fetch('http://127.0.0.1:4180/__reset', { method: 'POST' }).catch(() => {})

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // mid-range Android
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

await page.goto(`${BASE}/table-mountain-plumbing`, { waitUntil: 'networkidle' })

// --- the page hydrates from the config row -------------------------------
const body = await page.innerText('body')
check(body.includes('Table Mountain Plumbing'), 'business name renders from config')
check(body.includes('Burst pipe? Blocked drain?'), 'tagline renders from config')
check(body.includes('Southern Suburbs'), 'service area renders from config')
check(body.includes('Nandi M.'), 'testimonial renders from config')
check(body.includes('Do you charge a call-out fee?'), 'FAQ renders from config')

// Branding must come through as CSS variables, not a hardcoded colour.
const brand = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim(),
)
check(brand === '#2F5D7C', 'tenant brand colour applied as CSS variable', `got "${brand}"`)

// --- step 1: pick a service ----------------------------------------------
await page.getByRole('radio', { name: /Blocked drain clearing/i }).click()
await page.getByRole('button', { name: /Continue/i }).click()

// --- step 2: describe the job --------------------------------------------
await page.waitForSelector('#description')
const prompt = await page.innerText('label[for="description"]')
check(
  prompt.toLowerCase().includes('blocked drain clearing'),
  'form prompt adapts to the chosen service',
  `got "${prompt}"`,
)
await page.fill('#description', 'Shower drains very slowly and smells.')
await page.fill('#location', 'Observatory')
await page.getByRole('button', { name: /Continue/i }).click()

// --- validation must actually block --------------------------------------
await page.waitForSelector('#customer_name')
await page.fill('#customer_name', 'A')
await page.fill('#phone', '12345')
await page.getByRole('button', { name: /Send my request/i }).click()
await page.waitForTimeout(300)
const afterBad = await page.innerText('body')
check(afterBad.includes('valid South African number'), 'invalid phone is rejected client-side')
check(!afterBad.includes('Got it,'), 'bad input does not reach the confirmation screen')

// --- submit properly ------------------------------------------------------
await page.fill('#customer_name', 'Johan Botha')
await page.fill('#phone', '083 555 0121')
await page.fill('#email', 'jbotha@example.co.za')
await page.getByRole('button', { name: /Send my request/i }).click()
await page.waitForTimeout(900)

const done = await page.innerText('body')
check(done.includes('Got it, Johan'), 'confirmation screen greets the customer by first name')
check(done.includes('Ref '), 'confirmation shows a reference')
check(/emailed a copy/i.test(done), 'confirmation reports the email that was actually sent')

// --- no crashes, and the WhatsApp deep link is real ----------------------
const wa = await page.getAttribute('a[href^="https://wa.me/"]', 'href')
check(Boolean(wa && wa.includes('27825550142')), 'WhatsApp deep link uses the tenant number', String(wa))
check(pageErrors.length === 0, 'no uncaught page errors', pageErrors.join(' | '))

// The mock asserts things the browser cannot see: that PostgREST was asked
// for the right schema, and that the phone reached the wire already in E.164.
const audit = await fetch('http://127.0.0.1:4180/__problems').then((r) => r.json())
check(audit.problems.length === 0, 'backend request contract holds', audit.problems.join(' | '))
check(audit.leadsReceived === 1, 'exactly one lead reached the function', String(audit.leadsReceived))

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(
  failed.length === 0
    ? `\nALL ${results.length} LANDING E2E CHECKS PASSED`
    : `\n${failed.length} of ${results.length} CHECKS FAILED`,
)
process.exit(failed.length === 0 ? 0 : 1)
