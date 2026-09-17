import { useAuth } from '../context/AuthProvider'
import ChildRowEditor from '../components/dashboard/ChildRowEditor'

export default function ServicesPage() {
  const { activeBusiness } = useAuth()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Services</h1>
        <p className="mt-1 text-sm text-slate-500">
          These are the options a customer picks from on your page — and what each new lead
          gets tagged with.
        </p>
      </div>

      <ChildRowEditor
        table="services"
        businessId={activeBusiness.id}
        title="What you offer"
        description="Keep it to the jobs you actually want to be called about."
        addLabel="Add service"
        labelOf={(r) => r.name}
        blank={{ name: '', description: '', starting_price: null, active: true }}
        fields={[
          { name: 'name', label: 'Service name', placeholder: 'Blocked drain clearing' },
          {
            name: 'description',
            label: 'Short description',
            type: 'textarea',
            rows: 2,
            placeholder: 'High-pressure jetting and camera inspection.',
            hint: 'Also used as the example text in the quote form.',
          },
          {
            name: 'starting_price',
            label: 'Starting price (R)',
            type: 'number',
            min: 0,
            step: 1,
            hint: 'Optional. Shown as "From R650" — leave blank to hide it.',
          },
          { name: 'sort_order', label: 'Order', type: 'number', hint: 'Lower numbers show first.' },
          { name: 'active', label: 'Visible', type: 'checkbox', checkboxLabel: 'Offer this service' },
        ]}
      />
    </div>
  )
}
