import { useBusinessConfig } from '../../context/BusinessConfigProvider'
import { telLink, whatsappLink } from '../../lib/format'

export default function LandingHero({ onGetQuote }) {
  const { business } = useBusinessConfig()
  const wa = whatsappLink(
    business.whatsapp_number,
    `Hi ${business.name}, I'd like a quote please.`,
  )

  return (
    <header className="relative overflow-hidden bg-ink text-white">
      {/* Brand wash — derived from the tenant's primary colour, no images
          required, so a business with no photos still looks deliberate. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(120% 90% at 85% -10%, var(--brand-primary) 0%, transparent 55%),' +
            'radial-gradient(90% 70% at 0% 100%, var(--brand-primary-dark) 0%, transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="section relative py-6">
        <nav className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt=""
                className="h-11 w-11 rounded-xl bg-white/10 object-contain p-1"
              />
            ) : (
              <span
                className="grid h-11 w-11 place-items-center rounded-xl text-base font-bold"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
                aria-hidden="true"
              >
                {business.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-base font-bold tracking-tight">{business.name}</span>
          </div>

          {business.phone ? (
            <a
              href={telLink(business.phone)}
              className="rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              <span aria-hidden="true">📞</span>{' '}
              <span className="hidden sm:inline">{business.phone}</span>
              <span className="sm:hidden">Call</span>
            </a>
          ) : null}
        </nav>
      </div>

      <div className="section relative pb-16 pt-8 sm:pb-24 sm:pt-14">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Taking bookings now
          </p>

          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            {business.tagline || `${business.name} — get a fast, honest quote.`}
          </h1>

          {business.about ? (
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">{business.about}</p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onGetQuote} className="btn btn-primary px-6 py-3 text-base">
              Get my free quote
              <span aria-hidden="true">→</span>
            </button>

            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="btn border border-white/25 bg-white/10 px-5 py-3 text-base text-white backdrop-blur hover:bg-white/20"
              >
                <span aria-hidden="true">💬</span> WhatsApp us
              </a>
            ) : null}
          </div>

          <p className="mt-5 text-sm text-white/70">
            Takes about a minute · No obligation · We reply fast
          </p>
        </div>
      </div>

      <svg
        className="relative block w-full text-slate-50"
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path fill="currentColor" d="M0 48h1440V0c-240 32-480 48-720 48S240 32 0 0z" />
      </svg>
    </header>
  )
}
