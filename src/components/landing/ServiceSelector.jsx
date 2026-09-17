import { useBusinessConfig } from '../../context/BusinessConfigProvider'
import { currency } from '../../lib/format'

export default function ServiceSelector({ value, onChange, error, compact = false }) {
  const { services } = useBusinessConfig()

  if (services.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        This business has not listed its services yet — tell us what you need in the next step.
      </p>
    )
  }

  return (
    <div>
      <ul
        className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}
        role="radiogroup"
        aria-label="What do you need help with?"
      >
        {services.map((service) => {
          const selected = value === service.id
          const from = currency(service.starting_price)

          return (
            <li key={service.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(service.id)}
                className={`group flex h-full w-full flex-col rounded-2xl border-2 p-4 text-left transition ${
                  selected
                    ? 'shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
                style={
                  selected
                    ? {
                        borderColor: 'var(--brand-primary)',
                        background: 'var(--brand-primary-soft)',
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[15px] font-semibold leading-snug text-slate-900">
                    {service.name}
                  </span>
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
                      selected ? 'border-transparent' : 'border-slate-300'
                    }`}
                    style={selected ? { background: 'var(--brand-primary)' } : undefined}
                    aria-hidden="true"
                  >
                    {selected ? (
                      <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
                        <path
                          d="M2.5 6.2l2.4 2.4 4.6-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                </div>

                {service.description ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                    {service.description}
                  </p>
                ) : null}

                {from ? (
                  <p className="mt-auto pt-3 text-xs font-semibold text-slate-600">
                    From <span className="text-sm text-slate-900">{from}</span>
                  </p>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>

      {error ? (
        <p className="error-text">
          <span aria-hidden="true">•</span> {error}
        </p>
      ) : null}
    </div>
  )
}
