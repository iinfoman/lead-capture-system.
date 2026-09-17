import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthProvider'
import SettingsForm from '../components/dashboard/SettingsForm'
import ChildRowEditor from '../components/dashboard/ChildRowEditor'

const TABS = [
  { key: 'business', label: 'Business' },
  { key: 'testimonials', label: 'Reviews' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'photos', label: 'Work photos' },
]

export default function SettingsPage() {
  const { activeBusiness } = useAuth()
  const [business, setBusiness] = useState(activeBusiness)
  const [tab, setTab] = useState('business')

  // A platform admin can switch tenants from the header while sitting on this
  // page; without this the form would keep editing the previous business.
  useEffect(() => {
    setBusiness(activeBusiness)
  }, [activeBusiness])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything here drives your public page. No code, no redeploy.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'business' ? (
        <SettingsForm business={business} onSaved={setBusiness} />
      ) : null}

      {tab === 'testimonials' ? (
        <ChildRowEditor
          table="testimonials"
          businessId={business.id}
          title="Customer reviews"
          description="Real quotes from happy customers. These rotate on your page."
          addLabel="Add review"
          labelOf={(r) => r.customer_name || r.quote}
          blank={{ customer_name: '', quote: '', rating: 5, active: true }}
          fields={[
            { name: 'customer_name', label: 'Customer name', placeholder: 'Nandi M., Claremont' },
            {
              name: 'quote',
              label: 'What they said',
              type: 'textarea',
              rows: 3,
              placeholder: 'Arrived within the hour and the price was exactly as quoted.',
            },
            { name: 'rating', label: 'Rating out of 5', type: 'number', min: 1, max: 5 },
            { name: 'sort_order', label: 'Order', type: 'number', hint: 'Lower numbers show first.' },
            { name: 'active', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on my page' },
          ]}
        />
      ) : null}

      {tab === 'faqs' ? (
        <ChildRowEditor
          table="faqs"
          businessId={business.id}
          title="Frequently asked questions"
          description="Answer the questions that come up on every call — it saves you the call."
          addLabel="Add question"
          labelOf={(r) => r.question}
          blank={{ question: '', answer: '' }}
          fields={[
            { name: 'question', label: 'Question', placeholder: 'Do you charge a call-out fee?' },
            { name: 'answer', label: 'Answer', type: 'textarea', rows: 3 },
            { name: 'sort_order', label: 'Order', type: 'number', hint: 'Lower numbers show first.' },
          ]}
        />
      ) : null}

      {tab === 'photos' ? (
        <ChildRowEditor
          table="work_photos"
          businessId={business.id}
          title="Work photos"
          description="Before-and-afters sell better than any description. Add a few."
          addLabel="Add photo"
          imageFolder="work"
          labelOf={(r) => r.caption || 'Photo'}
          blank={{ image_url: '', caption: '' }}
          fields={[
            { name: 'image_url', label: 'Photo', type: 'image', hint: 'JPG, PNG or WEBP up to 5MB.' },
            { name: 'caption', label: 'Caption', placeholder: 'Full bathroom re-pipe in Newlands' },
            { name: 'sort_order', label: 'Order', type: 'number', hint: 'Lower numbers show first.' },
          ]}
        />
      ) : null}
    </div>
  )
}
