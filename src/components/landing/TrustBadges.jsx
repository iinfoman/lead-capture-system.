import { useBusinessConfig } from '../../context/BusinessConfigProvider'

/**
 * Trust signals assembled from whatever config the business has filled in.
 * Anything missing is simply dropped rather than shown as an empty promise.
 */
export default function TrustBadges() {
  const { business, testimonials } = useBusinessConfig()

  const rated = testimonials.filter((t) => t.rating)
  const average =
    rated.length > 0
      ? (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length).toFixed(1)
      : null

  const badges = [
    business.service_area && {
      icon: '📍',
      title: 'Local to you',
      detail: business.service_area,
    },
    average && {
      icon: '⭐',
      title: `${average} out of 5`,
      detail: `From ${rated.length} customer review${rated.length === 1 ? '' : 's'}`,
    },
    business.hours?.emergency && {
      icon: '🚨',
      title: 'Emergency cover',
      detail: business.hours.emergency,
    },
    {
      icon: '💬',
      title: 'Straight answers',
      detail: 'Upfront pricing before any work starts',
    },
  ].filter(Boolean)

  return (
    <section className="section -mt-6 pb-4">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {badges.map((badge) => (
          <li key={badge.title} className="card flex items-start gap-3 p-4">
            <span className="text-xl leading-none" aria-hidden="true">
              {badge.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{badge.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{badge.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
