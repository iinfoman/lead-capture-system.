import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BusinessConfigProvider,
  useBusinessConfig,
} from '../context/BusinessConfigProvider'
import ConfirmationScreen from '../components/landing/ConfirmationScreen'
import LandingHero from '../components/landing/LandingHero'
import LeadForm from '../components/landing/LeadForm'
import ReviewsCarousel from '../components/landing/ReviewsCarousel'
import ServiceAreaText from '../components/landing/ServiceAreaText'
import TrustBadges from '../components/landing/TrustBadges'
import WhatsAppButton from '../components/landing/WhatsAppButton'
import WorkGallery from '../components/landing/WorkGallery'
import EmptyState from '../components/common/EmptyState'
import ErrorState from '../components/common/ErrorState'
import PageLoader from '../components/common/PageLoader'
import { telLink } from '../lib/format'

function LandingContent() {
  const { status, business, error } = useBusinessConfig()
  const [result, setResult] = useState(null)
  const formRef = useRef(null)

  if (status === 'loading') return <PageLoader message="Loading…" />

  if (status === 'not_found') {
    return (
      <div className="mx-auto max-w-lg px-5 py-24">
        <EmptyState
          icon="🔍"
          title="We could not find that business"
          description="Double-check the link — the address should look like /your-business-name."
          action={
            <Link to="/" className="btn btn-primary">
              Back to the start
            </Link>
          }
        />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="px-5 py-24">
        <ErrorState
          title="We could not load this page"
          description={
            error?.message ??
            'The database did not answer. Check your Supabase settings and try again.'
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (result) {
    return (
      <>
        <ConfirmationScreen result={result} onStartOver={() => setResult(null)} />
        <WhatsAppButton />
      </>
    )
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <LandingHero onGetQuote={scrollToForm} />
      <TrustBadges />
      <ReviewsCarousel />
      <WorkGallery />
      <div ref={formRef}>
        <LeadForm onSubmitted={setResult} />
      </div>
      <ServiceAreaText />

      <footer className="section border-t border-slate-200 pt-8 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <p className="font-semibold text-slate-700">{business.name}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {business.phone ? (
              <a href={telLink(business.phone)} className="hover:text-slate-800">
                {business.phone}
              </a>
            ) : null}
            {business.email ? (
              <a href={`mailto:${business.email}`} className="hover:text-slate-800">
                {business.email}
              </a>
            ) : null}
            {business.service_area ? <span>{business.service_area}</span> : null}
          </div>
        </div>
        <p className="pb-6 text-xs text-slate-400">
          © {new Date().getFullYear()} {business.name}. Quotes are free and carry no obligation.
        </p>
      </footer>

      <WhatsAppButton />
    </div>
  )
}

export default function LandingPage() {
  const { slug } = useParams()

  return (
    <BusinessConfigProvider slug={slug}>
      <LandingContent />
    </BusinessConfigProvider>
  )
}
