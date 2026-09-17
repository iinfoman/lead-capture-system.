import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isConfigured } from '../lib/config'
import { fetchActiveBusinesses } from '../lib/publicApi'
import Spinner from '../components/common/Spinner'

/**
 * The root route. Each tenant's real site is /:slug, so this is just a signpost:
 * it lists the live landing pages and points owners at their login. In
 * production a business normally has its own domain pointed at its own slug.
 */
export default function IndexPage() {
  const [businesses, setBusinesses] = useState(null)

  useEffect(() => {
    if (!isConfigured) {
      setBusinesses([])
      return
    }
    fetchActiveBusinesses()
      .then(setBusinesses)
      .catch(() => setBusinesses([]))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="section py-16 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Lead capture
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          A landing page and an inbox. That is the whole product.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Every business gets a page customers can actually use, and one place to work the
          leads it brings in.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/login" className="btn btn-primary px-6 py-3">
            Business owner login
          </Link>
        </div>

        <h2 className="mt-16 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Live pages
        </h2>

        {businesses === null ? (
          <div className="mt-6">
            <Spinner label="Loading businesses…" />
          </div>
        ) : !isConfigured ? (
          <p className="mt-4 max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Supabase is not configured. Copy{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">.env.example</code> to{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">.env</code> and set{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code>{' '}
            and{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        ) : businesses.length === 0 ? (
          <p className="mt-4 max-w-lg text-sm text-slate-500">
            No businesses yet. Run the seed migration in{' '}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">supabase/migrations</code>{' '}
            to create the two demo tenants.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => (
              <li key={b.slug}>
                <Link
                  to={`/${b.slug}`}
                  className="card group flex h-full flex-col p-5 transition hover:shadow-md"
                >
                  <span
                    className="mb-3 h-1.5 w-10 rounded-full"
                    style={{ background: b.primary_color || '#0f766e' }}
                    aria-hidden="true"
                  />
                  <span className="text-base font-bold text-slate-900">{b.name}</span>
                  {b.tagline ? (
                    <span className="mt-1.5 text-sm leading-relaxed text-slate-500">
                      {b.tagline}
                    </span>
                  ) : null}
                  <span className="mt-auto pt-4 text-sm font-semibold text-slate-500 transition group-hover:text-slate-700">
                    /{b.slug} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
