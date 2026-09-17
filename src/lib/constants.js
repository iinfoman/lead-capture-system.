// The seven pipeline statuses from the spec, in board order.
export const LEAD_STATUSES = [
  {
    value: 'new',
    label: 'New',
    hint: 'Just came in',
    dot: 'bg-sky-500',
    chip: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    column: 'border-sky-200',
  },
  {
    value: 'contacted',
    label: 'Contacted',
    hint: 'You have reached out',
    dot: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    column: 'border-indigo-200',
  },
  {
    value: 'quote_sent',
    label: 'Quote sent',
    hint: 'Waiting on their answer',
    dot: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    column: 'border-violet-200',
  },
  {
    value: 'follow_up',
    label: 'Follow up',
    hint: 'Needs another nudge',
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    column: 'border-amber-200',
  },
  {
    value: 'booked',
    label: 'Booked',
    hint: 'Job is in the diary',
    dot: 'bg-teal-500',
    chip: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    column: 'border-teal-200',
  },
  {
    value: 'completed',
    label: 'Completed',
    hint: 'Done and invoiced',
    dot: 'bg-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    column: 'border-emerald-200',
  },
  {
    value: 'lost',
    label: 'Lost',
    hint: 'Went elsewhere',
    dot: 'bg-slate-400',
    chip: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    column: 'border-slate-200',
  },
]

export const STATUS_MAP = Object.fromEntries(LEAD_STATUSES.map((s) => [s.value, s]))

export const URGENCY_OPTIONS = [
  { value: 'low', label: 'No rush', hint: 'Sometime in the next few weeks' },
  { value: 'medium', label: 'This week', hint: 'Would like it sorted soon' },
  { value: 'high', label: 'Urgent', hint: 'Next day or two please' },
  { value: 'emergency', label: 'Emergency', hint: 'Right now — it is causing damage' },
]

export const URGENCY_MAP = Object.fromEntries(URGENCY_OPTIONS.map((u) => [u.value, u]))

export const CONTACT_OPTIONS = [
  { value: 'call', label: 'Phone call', icon: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'email', label: 'Email', icon: '✉️' },
]

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
