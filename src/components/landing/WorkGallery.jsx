import { useState } from 'react'
import { useBusinessConfig } from '../../context/BusinessConfigProvider'

export default function WorkGallery() {
  const { workPhotos } = useBusinessConfig()
  const [lightbox, setLightbox] = useState(null)

  if (workPhotos.length === 0) return null

  return (
    <section className="section py-14" aria-labelledby="work-heading">
      <h2 id="work-heading" className="text-2xl font-bold tracking-tight text-slate-900">
        Recent work
      </h2>
      <p className="mt-1.5 text-sm text-slate-500">Jobs we have finished in your area.</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workPhotos.map((photo) => (
          <li key={photo.id}>
            <button
              type="button"
              onClick={() => setLightbox(photo)}
              className="group block w-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md"
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={photo.image_url}
                  alt={photo.caption || 'Example of our work'}
                  loading="lazy"
                  decoding="async"
                  width="800"
                  height="600"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                />
              </div>
              {photo.caption ? (
                <p className="px-4 py-3 text-sm font-medium text-slate-700">{photo.caption}</p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.caption || 'Photo'}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          >
            Close ✕
          </button>
          <figure onClick={(e) => e.stopPropagation()} className="max-h-full max-w-3xl">
            <img
              src={lightbox.image_url}
              alt={lightbox.caption || 'Example of our work'}
              width="1200"
              height="900"
              className="max-h-[75vh] w-full rounded-2xl object-contain"
            />
            {lightbox.caption ? (
              <figcaption className="mt-3 text-center text-sm text-white/80">
                {lightbox.caption}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </section>
  )
}
