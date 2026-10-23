import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const parsed = new URL(value)
    const isLocalDevelopment = import.meta.env.DEV && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    return (parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co')) || (parsed.protocol === 'http:' && isLocalDevelopment)
  } catch {
    return false
  }
}

export const isSupabaseConfigured = isValidSupabaseUrl(url) && Boolean(publishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null
