import { useBusinessConfig } from '../../context/BusinessConfigProvider'

/**
 * Trust signals, assembled from whatever the business has actually filled in.
 * Anything missing is dropped rather than shown as an empty promise.
 *
 * Deliberately NOT a row of identical cards — that grid is the most templated
 * section on the web and reads as machine-made. This is an asymmetric band:
 * the review score leads at a larger size, the rest sit beside it as a plain
 * list, so the eye gets a hierarchy instead of four equal boxes.
 */
export default function TrustBadges() {
  const { business, testimonials } = useBusinessConfig()

  const rated = testimonials.filter((t) => t.rating)
  const average =
    rated.length > 0 ? rated.reduce((sum, t) => sum + t.rating, 0) / rated.length : null

  const facts = [
    business.service_area && { label: 'Where we work', value: business.service_area },
    business.hours?.emergency && { label: 'After hours', value: business.hours.emergency },
    { label: 'Pricing', value: 'Agreed upfront, before any work starts' },
  ].filter(Boolean)

  return (
    <section className="section pb-2 pt-10" aria-label="Why customers pick us">
      <div className="grid gap-x-10 gap-y-6 border-b border-slate-200 pb-10 md:grid-cols-[auto,1fr] md:items-start">
        {average ? (
          <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-1">
            <p
              className="text-5xl font-extrabold leading-none tracking-tight"
              style={{ color: 'var(--brand-primary)' }}
            >
              {average.toFixed(1)}
            </p>
            <div>
              <p className="text-sm text-amber-500" aria-label={`${average.toFixed(1)} out of 5`}>
                <span aria-hidden="true">{'★'.repeat(Math.round(average))}</span>
                <span className="text-slate-300" aria-hidden="true">
                  {'★'.repeat(5 - Math.round(average))}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                from {rated.length} customer review{rated.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        ) : null}

        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {fact.label}
              </dt>
              <dd className="mt-1 text-[15px] font-medium leading-snug text-slate-800">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
