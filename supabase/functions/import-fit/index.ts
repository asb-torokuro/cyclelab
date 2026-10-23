import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const MAX_BYTES = 50 * 1024 * 1024
const FIT_EPOCH = 631065600
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-filename" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

type FitSample = { timestamp: number; powerW: number | null; distanceM: number | null; elevationM: number | null }
type FieldDef = { number: number; size: number; baseType: number }
type MessageDef = { globalNumber: number; fields: FieldDef[] }
type Summary = { startedAt: string | null; elapsedSeconds: number | null; distanceM: number | null; normalizedPowerW: number | null; intensityFactor: number | null; tss: number | null; wattsPerKg: number | null }

function u16(bytes: Uint8Array, offset: number): number { return bytes[offset] | (bytes[offset + 1] << 8) }
function u32(bytes: Uint8Array, offset: number): number { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0 }
function crc16(bytes: Uint8Array, start: number, end: number): number { let crc = 0; for (let i = start; i < end; i += 1) { let value = bytes[i]; for (let bit = 0; bit < 8; bit += 1) { const mix = (crc ^ value) & 1; crc >>>= 1; if (mix) crc ^= 0xA001; value >>>= 1 } } return crc & 0xffff }
async function sha256(bytes: Uint8Array): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("") }
function validate(bytes: Uint8Array): { ok: true; headerSize: number; dataSize: number } | { ok: false; reason: string } {
  if (bytes.byteLength > MAX_BYTES) return { ok: false, reason: "file_too_large" }
  if (bytes.byteLength < 14) return { ok: false, reason: "header_too_short" }
  const headerSize = bytes[0]
  if (headerSize < 12 || headerSize > 64 || headerSize + 2 > bytes.byteLength) return { ok: false, reason: "invalid_header_size" }
  if (bytes[8] !== 0x2e || bytes[9] !== 0x46 || bytes[10] !== 0x49 || bytes[11] !== 0x54) return { ok: false, reason: "invalid_fit_signature" }
  const dataSize = u32(bytes, 4); const dataEnd = headerSize + dataSize
  if (dataSize === 0 || dataEnd + 2 > bytes.byteLength) return { ok: false, reason: "invalid_data_size" }
  const stored = bytes[dataEnd] | (bytes[dataEnd + 1] << 8)
  if (stored !== crc16(bytes, 0, dataEnd)) return { ok: false, reason: "invalid_crc" }
  return { ok: true, headerSize, dataSize }
}
function readField(bytes: Uint8Array, offset: number, field: FieldDef, architecture: number): number | null {
  if (offset + field.size > bytes.length) return null
  if (field.size === 1) return bytes[offset]
  if (field.size === 2) return architecture === 0 ? u16(bytes, offset) : (bytes[offset] | (bytes[offset + 1] << 8))
  if (field.size === 4) return architecture === 0 ? u32(bytes, offset) : u32(bytes, offset)
  return null
}
function decodeSamples(bytes: Uint8Array, headerSize: number, dataSize: number): FitSample[] {
  const defs = new Map<number, { message: MessageDef; architecture: number }>(); const samples: FitSample[] = []; let offset = headerSize; const end = headerSize + dataSize
  while (offset < end) {
    const recordHeader = bytes[offset++]
    if (recordHeader & 0x80) continue
    const local = recordHeader & 0x0f
    if (recordHeader & 0x40) {
      if (offset + 5 > end) break
      const architecture = bytes[offset + 1]; const globalNumber = architecture === 0 ? u16(bytes, offset + 2) : u16(bytes, offset + 2)
      const fieldCount = bytes[offset + 4]; offset += 5; const fields: FieldDef[] = []
      for (let i = 0; i < fieldCount; i += 1) { if (offset + 3 > end) break; fields.push({ number: bytes[offset], size: bytes[offset + 1], baseType: bytes[offset + 2] }); offset += 3 }
      if (recordHeader & 0x20) { if (offset >= end) break; const devCount = bytes[offset++]; offset += devCount * 3 }
      defs.set(local, { message: { globalNumber, fields }, architecture }); continue
    }
    const definition = defs.get(local); if (!definition) break
    const values = new Map<number, number>(); let valid = true
    for (const field of definition.message.fields) { const value = readField(bytes, offset, field, definition.architecture); offset += field.size; if (value != null) values.set(field.number, value); else valid = false }
    if (!valid || definition.message.globalNumber !== 20) continue
    const timestamp = values.get(253); if (timestamp == null) continue
    const power = values.get(7); const distance = values.get(5); const elevation = values.get(2)
    samples.push({ timestamp: timestamp + FIT_EPOCH, powerW: power != null && power <= 65535 ? power : null, distanceM: distance != null && distance <= 0xffffffff ? distance / 100 : null, elevationM: elevation != null && elevation <= 65535 ? elevation / 5 - 500 : null })
  }
  return samples.sort((a, b) => a.timestamp - b.timestamp)
}
function normalizedPower(samples: FitSample[]): number | null { const points = samples.filter(s => s.powerW != null && s.timestamp >= 0); const fourth: number[] = []; for (let i = 0; i < points.length; i += 1) { const start = points[i].timestamp; const window = points.filter(p => p.timestamp >= start && p.timestamp < start + 30); if (window.length > 0 && window[window.length - 1].timestamp - start >= 29) { const avg = window.reduce((sum, p) => sum + (p.powerW ?? 0), 0) / window.length; fourth.push(avg ** 4) } } return fourth.length ? (fourth.reduce((a, b) => a + b, 0) / fourth.length) ** 0.25 : null }
function summarize(samples: FitSample[], ftp: number | null, mass: number | null): Summary {
  if (samples.length < 2) return { startedAt: null, elapsedSeconds: null, distanceM: null, normalizedPowerW: null, intensityFactor: null, tss: null, wattsPerKg: null }
  const first = samples[0]; const last = samples[samples.length - 1]; const elapsed = last.timestamp - first.timestamp; const distances = samples.map(s => s.distanceM).filter((v): v is number => v != null && Number.isFinite(v)); const distance = distances.length > 1 ? Math.max(0, distances[distances.length - 1] - distances[0]) : null; const np = normalizedPower(samples); const iff = np != null && ftp != null && ftp > 0 ? np / ftp : null; const tss = np != null && iff != null && elapsed > 0 ? elapsed * np * iff / (ftp! * 3600) * 100 : null; const wkg = np != null && mass != null && mass > 0 ? np / mass : null
  return { startedAt: new Date(first.timestamp * 1000).toISOString(), elapsedSeconds: elapsed > 0 ? elapsed : null, distanceM: distance, normalizedPowerW: np, intensityFactor: iff, tss, wattsPerKg: wkg }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)
  const auth = request.headers.get("Authorization")
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401)
  const contentLength = Number(request.headers.get("Content-Length") ?? "0")
  if (contentLength > MAX_BYTES) return json({ error: "file_too_large" }, 413)
  const raw = new Uint8Array(await request.arrayBuffer()); const checked = validate(raw)
  if (!checked.ok) return json({ error: checked.reason }, 400)
  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  if (!supabaseUrl || !supabaseKey) return json({ error: "function_configuration_failed" }, 500)
  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await supabase.auth.getUser(); if (userError || !userData.user) return json({ error: "unauthorized" }, 401)
  const ownerId = userData.user.id; const digest = await sha256(raw); const path = `${ownerId}/${digest}.fit`; const filename = (request.headers.get("x-filename") ?? "activity.fit").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255) || "activity.fit"
  const upload = await supabase.storage.from("fit-files").upload(path, raw, { contentType: "application/octet-stream", upsert: false })
  if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) return json({ error: "storage_failed" }, 502)
  const { data: settings } = await supabase.from("training_settings").select("ftp_w,body_mass_kg").eq("owner_id", ownerId).maybeSingle()
  const samples = decodeSamples(raw, checked.headerSize, checked.dataSize); const summary = summarize(samples, settings?.ftp_w ?? null, settings?.body_mass_kg ?? null)
  const activity = await supabase.from("activities").insert({ owner_id: ownerId, storage_path: path, original_filename: filename, raw_sha256: digest, file_size_bytes: raw.byteLength, started_at: summary.startedAt, elapsed_time_s: summary.elapsedSeconds, distance_m: summary.distanceM, normalized_power_w: summary.normalizedPowerW, intensity_factor: summary.intensityFactor, tss: summary.tss, watts_per_kg: summary.wattsPerKg, analysis_status: samples.length ? "analyzed" : "validated" }).select("id,raw_sha256,file_size_bytes,analysis_status,started_at,elapsed_time_s,distance_m,normalized_power_w,intensity_factor,tss,watts_per_kg").single()
  if (activity.error) { if (activity.error.code === "23505") return json({ error: "duplicate_activity" }, 409); return json({ error: "database_failed" }, 502) }
  if (samples.length) { const rows = samples.map(sample => ({ activity_id: activity.data.id, owner_id: ownerId, recorded_at: new Date(sample.timestamp * 1000).toISOString(), power_w: sample.powerW, distance_m: sample.distanceM, elevation_m: sample.elevationM })); const inserted = await supabase.from("activity_samples").insert(rows); if (inserted.error) return json({ error: "sample_storage_failed" }, 502) }
  return json({ activity: activity.data, sampleCount: samples.length, fit: { headerSize: checked.headerSize, dataSize: checked.dataSize } }, 201)
})
