import { useBusinessConfig } from '../../context/BusinessConfigProvider'

const DAY_LABELS = {
  mon_fri: 'Monday – Friday',
  sat: 'Saturday',
  sun: 'Sunday',
  emergency: 'Emergencies',
}

/**
 * The text-only stand-in for a map. A real map means a paid Maps API key,
 * which the MVP deliberately avoids — the service area and hours are what a
 * customer actually needs to know before they call.
 */
export default function ServiceAreaText() {
  const { business, faqs } = useBusinessConfig()
  const hours = business.hours && typeof business.hours === 'object' ? business.hours : null

  if (!business.service_area && !hours && faqs.length === 0) return null

  return (
    <section className="section py-14" aria-labelledby="area-heading">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 id="area-heading" className="text-2xl font-bold tracking-tight text-slate-900">
            Where we work &amp; when
          </h2>

          {business.service_area ? (
            <div className="card mt-6 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service area
              </p>
              <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-slate-800">
                <span aria-hidden="true">📍</span> {business.service_area}
              </p>
              <p className="hint">
                Just outside this area? Send the form anyway — we will tell you straight
                if we cannot help.
              </p>
            </div>
          ) : null}

          {hours ? (
            <dl className="card mt-4 divide-y divide-slate-100">
              {Object.entries(hours)
                .filter(([, value]) => value)
                .map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-4 px-5 py-3">
                    <dt className="text-sm font-medium text-slate-600">
                      {DAY_LABELS[key] ?? key.replace(/_/g, ' ')}
                    </dt>
                    <dd className="text-sm font-semibold text-slate-900">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </div>

        {faqs.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Common questions</h2>
            <div className="card mt-6 divide-y divide-slate-100">
              {faqs.map((faq) => (
                <details key={faq.id} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-slate-900">
                    {faq.question}
                    <span
                      className="shrink-0 text-slate-500 transition group-open:rotate-45"
                      aria-hidden="true"
                    >
                      ＋
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
