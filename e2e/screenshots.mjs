// Drives the real app against the preview mock and captures each screen, so
// the design and flow can be reviewed without a deployment.
const PW_ENTRY = process.env.PW_ENTRY || 'playwright'
const { chromium } = await import(PW_ENTRY)

const BASE = 'http://127.0.0.1:4174'
const OUT = process.env.OUT || 'preview'
const shots = []

const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
)

async function shoot(page, name, opts = {}) {
  const file = `${OUT}/${name}.png`
  await page.screenshot({ path: file, ...opts })
  shots.push(file)
  console.log('  captured', file)
}

// ---------------------------------------------------------------- desktop
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const p = await desktop.newPage()

await p.goto(`${BASE}/table-mountain-plumbing`, { waitUntil: 'networkidle' })
await p.waitForTimeout(600)
await shoot(p, '01-landing-hero')
await shoot(p, '02-landing-full', { fullPage: true })

// Step through the quote form the way a customer would.
await p.getByRole('button', { name: /Get my free quote/i }).click()
await p.waitForTimeout(700)
await shoot(p, '03-form-services')

await p.getByRole('radio', { name: /Blocked drain clearing/i }).click()
await p.getByRole('button', { name: /Continue/i }).click()
await p.waitForTimeout(400)
await p.fill('#description', 'Shower drains very slowly and there is a smell coming up. It has been getting worse for about a week.')
await p.fill('#location', 'Observatory')
await shoot(p, '04-form-details')

await p.getByRole('button', { name: /Continue/i }).click()
await p.waitForTimeout(400)
await p.fill('#customer_name', 'Johan Botha')
await p.fill('#phone', '083 555 0121')
await p.fill('#email', 'jbotha@example.co.za')
await shoot(p, '05-form-contact')

await p.getByRole('button', { name: /Send my request/i }).click()
await p.waitForTimeout(1200)
await shoot(p, '06-confirmation')

// ------------------------------------------------------------- dashboard
await p.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await p.waitForTimeout(400)
await shoot(p, '07-login')

await p.fill('#email', 'iinfoworks@gmail.com')
await p.fill('#password', 'preview-password')
await p.getByRole('button', { name: /^Sign in$/i }).click()
await p.waitForTimeout(2000)
await shoot(p, '08-dashboard-board')

// Open a lead to show the working surface.
const card = p.getByRole('button', { name: /Open lead from Lerato Dube/i })
if (await card.count()) {
  await card.first().click()
  await p.waitForTimeout(900)
  await shoot(p, '09-lead-detail')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(500)
}

await p.goto(`${BASE}/dashboard/settings`, { waitUntil: 'networkidle' })
await p.waitForTimeout(1000)
await shoot(p, '10-settings', { fullPage: true })

await p.goto(`${BASE}/master-admin`, { waitUntil: 'networkidle' })
await p.waitForTimeout(1400)
await shoot(p, '11-master-admin', { fullPage: true })

// ----------------------------------------------------------------- phone
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})
const m = await phone.newPage()
await m.goto(`${BASE}/table-mountain-plumbing`, { waitUntil: 'networkidle' })
await m.waitForTimeout(700)
await shoot(m, '12-mobile-hero')
await shoot(m, '13-mobile-full', { fullPage: true })

await m.goto(`${BASE}/atlantic-sparks`, { waitUntil: 'networkidle' })
await m.waitForTimeout(700)
await shoot(m, '14-mobile-second-tenant')

await browser.close()
console.log(`\n${shots.length} screenshots written to ${OUT}/`)
