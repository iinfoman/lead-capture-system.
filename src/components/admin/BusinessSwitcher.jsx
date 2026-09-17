import { useAuth } from '../../context/AuthProvider'

/**
 * Lets a platform admin point the dashboard at any tenant — the "jump into a
 * client's dashboard to help them troubleshoot" flow, without a second login.
 *
 * Nothing here grants access: the reads still go through RLS, and they only
 * return rows because this account is in `platform_admins`.
 */
export default function BusinessSwitcher({ className = '' }) {
  const { isPlatformAdmin, allBusinesses, activeBusiness, ownBusinesses, viewAs } = useAuth()

  if (!isPlatformAdmin || allBusinesses.length === 0) return null

  const ownId = ownBusinesses[0]?.id ?? ''

  return (
    <label className={`flex items-center gap-2 ${className}`}>
      <span className="sr-only">Viewing business</span>
      <select
        value={activeBusiness?.id ?? ''}
        onChange={(e) => viewAs(e.target.value === ownId ? null : e.target.value)}
        className="field w-auto max-w-[14rem] py-1.5 text-sm"
        aria-label="Switch business"
      >
        {allBusinesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.id === ownId ? ' (mine)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
