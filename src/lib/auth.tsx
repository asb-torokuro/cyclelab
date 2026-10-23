/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

type AuthContextValue = { session: Session | null; user: User | null; loading: boolean; error: string | null; configured: boolean; signOut: () => Promise<{ error: Error | null }> }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let active = true
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!active) return
      if (authError) { setError('認証状態を確認できませんでした。ページを再読み込みしてください。'); setSession(null) }
      else setSession(data.session)
      setLoading(false)
    }).catch(() => { if (active) { setError('認証状態を確認できませんでした。ページを再読み込みしてください。'); setSession(null); setLoading(false) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  const value = useMemo<AuthContextValue>(() => ({
    session, user: session?.user ?? null, loading, error, configured: Boolean(supabase),
    signOut: async () => {
      if (!supabase) return { error: new Error('Supabase is not configured') }
      const { error: authError } = await supabase.auth.signOut()
      if (!authError) setSession(null)
      return { error: authError }
    },
  }), [error, loading, session])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
