import { useEffect, useState } from 'react'
import { useBusinessConfig } from '../../context/BusinessConfigProvider'

function Stars({ rating }) {
  if (!rating) return null
  return (
    <p className="text-sm tracking-wide text-amber-500" aria-label={`${rating} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(rating)}</span>
      <span className="text-slate-300" aria-hidden="true">
        {'★'.repeat(5 - rating)}
      </span>
    </p>
  )
}

export default function ReviewsCarousel() {
  const { testimonials, business } = useBusinessConfig()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || testimonials.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % testimonials.length), 6000)
    return () => clearInterval(id)
  }, [paused, testimonials.length])

  if (testimonials.length === 0) return null

  const current = testimonials[Math.min(index, testimonials.length - 1)]

  return (
    <section className="section py-14" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-2xl font-bold tracking-tight text-slate-900">
        What customers say
      </h2>

      <div
        className="card mt-6 p-7 sm:p-9"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <blockquote key={current.id} className="animate-fade-in">
          <Stars rating={current.rating} />
          <p className="mt-3 text-lg leading-relaxed text-slate-800 sm:text-xl">
            “{current.quote}”
          </p>
          {current.customer_name ? (
            <footer className="mt-4 text-sm font-semibold text-slate-500">
              — {current.customer_name}
            </footer>
          ) : null}
        </blockquote>

        {testimonials.length > 1 ? (
          <div className="mt-7 flex items-center gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show review ${i + 1} of ${testimonials.length}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-7' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                style={i === index ? { background: 'var(--brand-primary)' } : undefined}
              />
            ))}
          </div>
        ) : null}
      </div>

      {business.google_review_link ? (
        <p className="mt-4 text-sm text-slate-500">
          <a
            href={business.google_review_link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline decoration-slate-300 underline-offset-4 hover:text-slate-800"
          >
            Read more reviews on Google →
          </a>
        </p>
      ) : null}
    </section>
  )
}
