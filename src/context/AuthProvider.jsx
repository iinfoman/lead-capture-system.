import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { checkPlatformAdmin, fetchAllBusinesses, fetchMemberships } from '../lib/api'

const AuthContext = createContext(null)

const VIEW_AS_KEY = 'leadcapture.viewAsBusinessId'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState([])
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [allBusinesses, setAllBusinesses] = useState([])
  const [viewAsBusinessId, setViewAsBusinessId] = useState(
    () => sessionStorage.getItem(VIEW_AS_KEY) || null,
  )
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  // Resolve who this user is inside the app: which business(es) they own, and
  // whether they are a platform admin. Both come from RLS-scoped reads.
  useEffect(() => {
    if (!userId) {
      setMemberships([])
      setIsPlatformAdmin(false)
      setAllBusinesses([])
      return
    }

    let active = true
    setProfileLoading(true)

    Promise.all([fetchMemberships(userId), checkPlatformAdmin(userId)])
      .then(async ([rows, admin]) => {
        if (!active) return
        setMemberships(rows)
        setIsPlatformAdmin(admin)
        if (admin) {
          const businesses = await fetchAllBusinesses().catch(() => [])
          if (active) setAllBusinesses(businesses)
        }
      })
      .catch((err) => console.error('[leadcapture] profile load failed', err))
      .finally(() => {
        if (active) setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  const ownBusinesses = useMemo(
    () => memberships.map((m) => m.business).filter(Boolean),
    [memberships],
  )

  // Which tenant the dashboard is currently showing. Normally the user's own.
  // A platform admin may point it at any business — that is the "jump into a
  // client's dashboard" flow, and it only works because of the stacked admin
  // RLS policies, never because of a service-role key in the browser.
  const activeBusiness = useMemo(() => {
    if (viewAsBusinessId) {
      const found =
        allBusinesses.find((b) => b.id === viewAsBusinessId) ??
        ownBusinesses.find((b) => b.id === viewAsBusinessId)
      if (found) return found
    }
    return ownBusinesses[0] ?? null
  }, [viewAsBusinessId, allBusinesses, ownBusinesses])

  const viewAs = useCallback(
    (businessId) => {
      if (!isPlatformAdmin && businessId) return
      setViewAsBusinessId(businessId)
      if (businessId) sessionStorage.setItem(VIEW_AS_KEY, businessId)
      else sessionStorage.removeItem(VIEW_AS_KEY)
    },
    [isPlatformAdmin],
  )

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(VIEW_AS_KEY)
    setViewAsBusinessId(null)
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profileLoading,
      memberships,
      ownBusinesses,
      allBusinesses,
      activeBusiness,
      isPlatformAdmin,
      isImpersonating: Boolean(
        viewAsBusinessId && !ownBusinesses.some((b) => b.id === viewAsBusinessId),
      ),
      viewAs,
      signIn,
      signUp,
      signOut,
    }),
    [
      session,
      loading,
      profileLoading,
      memberships,
      ownBusinesses,
      allBusinesses,
      activeBusiness,
      isPlatformAdmin,
      viewAsBusinessId,
      viewAs,
      signIn,
      signUp,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
