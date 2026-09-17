import { useBusinessConfig } from '../../context/BusinessConfigProvider'
import { telLink, whatsappLink } from '../../lib/format'

export default function ConfirmationScreen({ result, onStartOver }) {
  const { business } = useBusinessConfig()
  const firstName = (result.form?.customer_name ?? '').split(' ')[0] || 'there'

  const wa = whatsappLink(
    business.whatsapp_number,
    `Hi ${business.name}, I just sent a request through your website` +
      (result.reference ? ` (ref ${result.reference})` : '') +
      '.',
  )

  const emailedCustomer = result.notified?.customer
  const emailGiven = Boolean(result.form?.email)

  return (
    <div className="section flex min-h-[80vh] items-center py-14">
      <div className="mx-auto w-full max-w-lg animate-slide-up text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl"
          style={{ background: 'var(--brand-primary-soft)' }}
          aria-hidden="true"
        >
          ✅
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
          Got it, {firstName}.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {business.name} has your request
          {result.form?.urgency === 'emergency'
            ? ' and it is flagged as an emergency, so expect a call shortly.'
            : ' and will be in touch shortly.'}
        </p>

        {result.reference ? (
          <p className="mt-4 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-600">
            Ref {result.reference}
          </p>
        ) : null}

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
        </div>

        <div className="card mt-8 p-5 text-left">
          <p className="text-sm font-semibold text-slate-900">What happens next</p>
          <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
            <li className="flex gap-2.5">
              <span className="font-bold text-slate-400">1.</span>
              <span>
                We review what you sent
                {result.form?.service?.name ? ` about ${result.form.service.name.toLowerCase()}` : ''}.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-bold text-slate-400">2.</span>
              <span>
                We get back to you by{' '}
                <strong className="text-slate-800">
                  {result.form?.preferred_contact === 'whatsapp'
                    ? 'WhatsApp'
                    : result.form?.preferred_contact === 'email'
                      ? 'email'
                      : 'phone'}
                </strong>
                , usually within a couple of hours during working hours.
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-bold text-slate-400">3.</span>
              <span>You get a clear price before any work starts.</span>
            </li>
          </ol>
        </div>

        {emailGiven ? (
          <p className="mt-5 text-xs text-slate-500">
            {emailedCustomer
              ? `We have emailed a copy of your request to ${result.form.email}.`
              : 'Your request is saved. Our confirmation email did not go out — but the business has your details either way.'}
          </p>
        ) : null}

        <button type="button" onClick={onStartOver} className="btn btn-ghost mt-6 text-sm">
          Send another request
        </button>
      </div>
    </div>
  )
}
