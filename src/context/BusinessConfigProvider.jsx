import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { fetchBusinessBySlug } from '../lib/publicApi'
import { isConfigured } from '../lib/config'
import { readableOn, shade } from '../lib/format'

const BusinessConfigContext = createContext(null)

/**
 * Hydrates the entire public site from one `businesses` row plus its child
 * tables. Nothing below this provider hardcodes a business name, colour or
 * phone number — that is the whole point of the config-driven design.
 */
export function BusinessConfigProvider({ slug, children }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })

  useEffect(() => {
    let active = true

    // Without Supabase credentials every query would hang against a bogus
    // host and leave the page spinning. Say so instead.
    if (!isConfigured) {
      setState({
        status: 'error',
        data: null,
        error: new Error(
          'Supabase is not configured. Copy .env.example to .env and set ' +
            'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        ),
      })
      return undefined
    }

    setState({ status: 'loading', data: null, error: null })

    fetchBusinessBySlug(slug)
      .then((data) => {
        if (!active) return
        if (!data) {
          setState({ status: 'not_found', data: null, error: null })
          return
        }
        setState({ status: 'ready', data, error: null })
      })
      .catch((error) => {
        if (!active) return
        console.error('[leadcapture] business load failed', error)
        setState({ status: 'error', data: null, error })
      })

    return () => {
      active = false
    }
  }, [slug])

  const business = state.data?.business ?? null

  // Branding lands as CSS custom properties on :root so Tailwind's
  // `bg-brand` / `text-ink` utilities resolve per tenant with no rebuild.
  useEffect(() => {
    if (!business) return
    const root = document.documentElement
    const primary = business.primary_color || '#0f766e'
    const secondary = business.secondary_color || '#111827'

    const vars = {
      '--brand-primary': primary,
      '--brand-primary-dark': shade(primary, -0.18),
      '--brand-primary-light': shade(primary, 0.88),
      '--brand-primary-soft': shade(primary, 0.94),
      '--brand-on-primary': readableOn(primary),
      '--brand-secondary': secondary,
    }
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))

    const previousTitle = document.title
    document.title = business.tagline
      ? `${business.name} — ${business.tagline}`
      : business.name

    return () => {
      document.title = previousTitle
      Object.keys(vars).forEach((k) => root.style.removeProperty(k))
    }
  }, [business])

  const value = useMemo(
    () => ({
      status: state.status,
      error: state.error,
      business,
      services: state.data?.services ?? [],
      testimonials: state.data?.testimonials ?? [],
      faqs: state.data?.faqs ?? [],
      workPhotos: state.data?.workPhotos ?? [],
    }),
    [state, business],
  )

  return (
    <BusinessConfigContext.Provider value={value}>{children}</BusinessConfigContext.Provider>
  )
}

export function useBusinessConfig() {
  const ctx = useContext(BusinessConfigContext)
  if (!ctx) throw new Error('useBusinessConfig must be used inside <BusinessConfigProvider>')
  return ctx
}
