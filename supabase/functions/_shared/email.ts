// Email via Resend's free tier. Both sends are best-effort: a lead that is
// safely in the database must never be reported as failed because an email
// provider had a bad minute. Failures are logged and surfaced in the response
// as `notified: false` so the dashboard can show a nudge.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export type EmailResult = { sent: boolean; error?: string }

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function send(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<EmailResult> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) return { sent: false, error: 'RESEND_API_KEY not configured' }

  const from = Deno.env.get('RESEND_FROM') ?? 'Leads <onboarding@resend.dev>'

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    if (!res.ok) {
      return { sent: false, error: `resend ${res.status}: ${await res.text()}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: String(err) }
  }
}

type LeadForEmail = {
  id: string
  customer_name: string
  phone: string
  whatsapp: string | null
  email: string | null
  location: string | null
  urgency: string
  description: string
  preferred_contact: string
  photo_url: string | null
}

type BusinessForEmail = {
  name: string
  email: string | null
  phone: string | null
  whatsapp_number: string | null
  primary_color: string | null
}

const URGENCY_LABEL: Record<string, string> = {
  low: 'Low — whenever suits',
  medium: 'Medium — this week',
  high: 'High — in the next day or two',
  emergency: 'EMERGENCY — right now',
}

const shell = (accent: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
  <div style="border-top:4px solid ${escapeHtml(accent)};border-radius:2px"></div>
  ${body}
  <p style="margin-top:32px;font-size:12px;color:#6b7280">
    Sent automatically when a lead came in through your website.
  </p>
</div>`

export function notifyBusiness(
  business: BusinessForEmail,
  lead: LeadForEmail,
  serviceName: string | null,
  dashboardUrl: string,
): Promise<EmailResult> {
  if (!business.email) {
    return Promise.resolve({ sent: false, error: 'business has no email on file' })
  }

  const accent = business.primary_color ?? '#0f766e'
  const urgent = lead.urgency === 'emergency' || lead.urgency === 'high'
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:14px;font-weight:500">${escapeHtml(value)}</td>
    </tr>`

  const html = shell(
    accent,
    `
    <h1 style="font-size:20px;margin:20px 0 4px">New lead: ${escapeHtml(lead.customer_name)}</h1>
    <p style="margin:0 0 20px;color:#6b7280;font-size:14px">
      ${escapeHtml(serviceName ?? 'General enquiry')}${urgent ? ' &middot; <strong style="color:#b91c1c">needs a fast reply</strong>' : ''}
    </p>
    <table style="border-collapse:collapse;width:100%">
      ${row('Phone', lead.phone)}
      ${lead.whatsapp ? row('WhatsApp', lead.whatsapp) : ''}
      ${lead.email ? row('Email', lead.email) : ''}
      ${lead.location ? row('Area', lead.location) : ''}
      ${row('Urgency', URGENCY_LABEL[lead.urgency] ?? lead.urgency)}
      ${row('Prefers', lead.preferred_contact)}
    </table>
    <div style="margin:20px 0;padding:14px 16px;background:#f9fafb;border-radius:8px;font-size:14px;line-height:1.5;white-space:pre-wrap">${escapeHtml(lead.description)}</div>
    ${lead.photo_url ? `<p style="font-size:14px"><a href="${escapeHtml(lead.photo_url)}" style="color:${escapeHtml(accent)}">View the photo they attached</a></p>` : ''}
    <p style="margin:24px 0">
      <a href="${escapeHtml(dashboardUrl)}"
         style="display:inline-block;background:${escapeHtml(accent)};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">
        Open in your dashboard
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280">
      Fastest reply wins the job — most customers go with whoever answers first.
    </p>`,
  )

  return send(
    business.email,
    `${urgent ? '🔴 ' : ''}New lead — ${lead.customer_name}${serviceName ? ` (${serviceName})` : ''}`,
    html,
    lead.email ?? undefined,
  )
}

export function confirmToCustomer(
  business: BusinessForEmail,
  lead: LeadForEmail,
  serviceName: string | null,
): Promise<EmailResult> {
  if (!lead.email) {
    return Promise.resolve({ sent: false, error: 'customer left no email' })
  }

  const accent = business.primary_color ?? '#0f766e'
  const contactLine = [
    business.phone ? `call ${business.phone}` : null,
    business.whatsapp_number ? `WhatsApp ${business.whatsapp_number}` : null,
  ]
    .filter(Boolean)
    .join(' or ')

  const html = shell(
    accent,
    `
    <h1 style="font-size:20px;margin:20px 0 8px">Thanks, ${escapeHtml(lead.customer_name.split(' ')[0])} — we have your request</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
      ${escapeHtml(business.name)} has your details and will be in touch shortly${
        lead.urgency === 'emergency' ? ', and we have flagged this as an emergency' : ''
      }.
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#6b7280">What you sent us</p>
    <div style="padding:14px 16px;background:#f9fafb;border-radius:8px;font-size:14px;line-height:1.5">
      <strong>${escapeHtml(serviceName ?? 'General enquiry')}</strong><br/>
      <span style="white-space:pre-wrap">${escapeHtml(lead.description)}</span>
    </div>
    ${contactLine ? `<p style="margin:20px 0 0;font-size:14px">Need us sooner? You can ${escapeHtml(contactLine)}.</p>` : ''}
    <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
      Reference: ${escapeHtml(lead.id.slice(0, 8))}
    </p>`,
  )

  return send(
    lead.email,
    `We got your request — ${business.name}`,
    html,
    business.email ?? undefined,
  )
}
