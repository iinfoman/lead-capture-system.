import { useBusinessConfig } from '../../context/BusinessConfigProvider'
import { whatsappLink } from '../../lib/format'

/**
 * Floating WhatsApp shortcut. Uses a wa.me deep link rather than the WhatsApp
 * Business API — same result for the customer, no API cost for the MVP.
 */
export default function WhatsAppButton({ message }) {
  const { business } = useBusinessConfig()
  const href = whatsappLink(
    business.whatsapp_number,
    message ?? `Hi ${business.name}, I'd like a quote please.`,
  )

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3.5 font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#1ebe5b] hover:shadow-xl sm:px-5"
      aria-label={`Message ${business.name} on WhatsApp`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.82 9.82 0 004.69 1.19h.01c5.43 0 9.85-4.42 9.85-9.86C21.9 6.42 17.47 2 12.04 2zm0 17.98h-.01a8.2 8.2 0 01-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.15 8.15 0 01-1.25-4.36c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.86 5.8 2.41a8.14 8.14 0 012.4 5.8c0 4.52-3.68 8.19-8.2 8.19z" />
      </svg>
      <span className="hidden text-sm sm:inline">WhatsApp us</span>
    </a>
  )
}
