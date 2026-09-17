import { Link, useParams } from 'react-router-dom'
import {
  BusinessConfigProvider,
  useBusinessConfig,
} from '../context/BusinessConfigProvider'
import PageLoader from '../components/common/PageLoader'
import WhatsAppButton from '../components/landing/WhatsAppButton'
import { telLink, whatsappLink } from '../lib/format'

/**
 * Standalone thank-you route. The form itself shows ConfirmationScreen inline
 * (no reload, keeps the details it needs), so this page exists for the case
 * where someone lands here directly — a bookmark, a back button, or an
 * external redirect.
 */
function ThankYouContent() {
  const { status, business } = useBusinessConfig()

  if (status === 'loading') return <PageLoader />
  if (status !== 'ready') {
    return (
      <div className="section py-24 text-center">
        <p className="text-slate-500">Thanks — your request is on its way.</p>
      </div>
    )
  }

  const wa = whatsappLink(business.whatsapp_number, `Hi ${business.name}, I just sent a request.`)

  return (
    <div className="section flex min-h-screen items-center py-16">
      <div className="mx-auto w-full max-w-lg text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl"
          style={{ background: 'var(--brand-primary-soft)' }}
          aria-hidden="true"
        >
          ✅
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">Thank you</h1>
        <p className="mt-3 text-[15px] text-slate-600">
          {business.name} has your request and will be in touch shortly.
        </p>

        <div className="mt-8 space-y-2.5">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="btn w-full bg-[#25D366] py-3 text-base text-white hover:bg-[#1ebe5b]"
            >
              <span aria-hidden="true">💬</span> Message us on WhatsApp
            </a>
          ) : null}
          {business.phone ? (
            <a href={telLink(business.phone)} className="btn btn-primary w-full py-3 text-base">
              <span aria-hidden="true">📞</span> Call {business.phone}
            </a>
          ) : null}
          <Link to={`/${business.slug}`} className="btn btn-ghost w-full">
            Back to {business.name}
          </Link>
        </div>
      </div>
      <WhatsAppButton />
    </div>
  )
}

export default function ThankYouPage() {
  const { slug } = useParams()
  return (
    <BusinessConfigProvider slug={slug}>
      <ThankYouContent />
    </BusinessConfigProvider>
  )
}
