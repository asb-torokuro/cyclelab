import { supabase } from './supabase'
import { ewma } from './analysis'

export type Activity = {
  id: string
  original_filename: string
  raw_sha256: string
  file_size_bytes: number
  started_at: string | null
  elapsed_time_s: number | null
  distance_m: number | null
  normalized_power_w: number | null
  intensity_factor: number | null
  tss: number | null
  watts_per_kg: number | null
  analysis_status: 'validated' | 'rejected' | 'analyzed'
  created_at: string
}

export type TrainingSettings = {
  owner_id?: string
  ftp_w: number | null
  ftp_type: 'manual' | 'direct_60m' | '20m_estimate' | 'ramp_estimate' | 'other' | null
  body_mass_kg: number | null
  ctl_days: number
  atl_days: number
}

async function userId() {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw error ?? new Error('Not authenticated')
  return data.user.id
}

export async function listActivities(): Promise<Activity[]> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('activities').select('id,original_filename,raw_sha256,file_size_bytes,started_at,elapsed_time_s,distance_m,normalized_power_w,intensity_factor,tss,watts_per_kg,analysis_status,created_at').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return (data ?? []) as Activity[]
}

export async function loadTrainingSettings(): Promise<TrainingSettings> {
  if (!supabase) throw new Error('Supabase is not configured')
  const owner_id = await userId()
  const { data, error } = await supabase.from('training_settings').select('owner_id,ftp_w,ftp_type,body_mass_kg,ctl_days,atl_days').eq('owner_id', owner_id).maybeSingle()
  if (error) throw error
  return { owner_id, ftp_w: data?.ftp_w ?? null, ftp_type: data?.ftp_type ?? null, body_mass_kg: data?.body_mass_kg ?? null, ctl_days: data?.ctl_days ?? 42, atl_days: data?.atl_days ?? 7 }
}

export async function saveTrainingSettings(settings: Omit<TrainingSettings, 'owner_id'>): Promise<TrainingSettings> {
  if (!supabase) throw new Error('Supabase is not configured')
  const owner_id = await userId()
  const { data, error } = await supabase.from('training_settings').upsert({ owner_id, ...settings }, { onConflict: 'owner_id' }).select('owner_id,ftp_w,ftp_type,body_mass_kg,ctl_days,atl_days').single()
  if (error) throw error
  return data as TrainingSettings
}

export type FitnessPoint = { date: string; tss: number; fitness: number; fatigue: number; form: number }

export function buildFitnessSeries(activities: Activity[], ctlDays: number, atlDays: number): FitnessPoint[] {
  const loads = new Map<string, number>()
  for (const activity of activities) {
    if (activity.tss == null || !Number.isFinite(activity.tss)) continue
    const date = (activity.started_at ?? activity.created_at).slice(0, 10)
    loads.set(date, (loads.get(date) ?? 0) + activity.tss)
  }
  const dates = [...loads.keys()].sort()
  let fitness = 0; let fatigue = 0
  return dates.map(date => {
    const tss = loads.get(date) ?? 0
    fitness = ewma(fitness, tss, ctlDays)
    fatigue = ewma(fatigue, tss, atlDays)
    return { date, tss, fitness, fatigue, form: fitness - fatigue }
  })
}
