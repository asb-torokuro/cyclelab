import { supabase } from './supabase'
export type Profile = { id: string; display_name: string | null; created_at: string; updated_at: string }
async function currentUserId() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Not authenticated')
  return data.user.id
}
export async function loadOrCreateProfile(): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured')
  const userId = await currentUserId()
  const { data, error } = await supabase.from('profiles').select('id, display_name, created_at, updated_at').eq('id', userId).maybeSingle()
  if (error) throw error
  if (data) return data as Profile
  const { data: created, error: insertError } = await supabase.from('profiles').insert({ id: userId }).select('id, display_name, created_at, updated_at').single()
  if (insertError) throw insertError
  return created as Profile
}
export async function updateProfile(displayName: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const userId = await currentUserId()
  const { data, error } = await supabase.from('profiles').update({ display_name: displayName.trim() || null }).eq('id', userId).select('id, display_name, created_at, updated_at').single()
  if (error) throw error
  return data as Profile
}
