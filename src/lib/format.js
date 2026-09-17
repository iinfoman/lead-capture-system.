const ZAR = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
})

export function currency(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? ZAR.format(n) : null
}

export function relativeTime(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export function fullDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dateOnly(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** wa.me deep link — the MVP stand-in for the WhatsApp Business API. */
export function whatsappLink(number, message) {
  if (!number) return null
  const digits = String(number).replace(/\D/g, '')
  if (!digits) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${text}`
}

export function telLink(number) {
  if (!number) return null
  return `tel:${String(number).replace(/[^\d+]/g, '')}`
}

export function initials(name) {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * Lighten or darken a hex colour. Used to derive hover/active shades from the
 * single primary colour a business picks, so they only choose one value.
 */
export function shade(hex, amount) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex ?? ''))
  if (!m) return hex
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)))
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16))
  const mix = (c) => clamp(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Pick readable foreground text for a given background colour. */
export function readableOn(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex ?? ''))
  if (!m) return '#ffffff'
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16) / 255)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminance > 0.45 ? '#111827' : '#ffffff'
}
