import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const MAX_BYTES = 50 * 1024 * 1024
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-filename" }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

function u32le(bytes: Uint8Array, offset: number): number { return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0 }
function crc16(bytes: Uint8Array, start: number, end: number): number { let crc = 0; for (let i = start; i < end; i += 1) { let value = bytes[i]; for (let bit = 0; bit < 8; bit += 1) { const mix = (crc ^ value) & 1; crc >>>= 1; if (mix) crc ^= 0xA001; value >>>= 1 } } return crc & 0xffff }
async function sha256(bytes: Uint8Array): Promise<string> { const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("") }
function validate(bytes: Uint8Array): { ok: true; headerSize: number; dataSize: number } | { ok: false; reason: string } {
  if (bytes.byteLength > MAX_BYTES) return { ok: false, reason: "file_too_large" }
  if (bytes.byteLength < 14) return { ok: false, reason: "header_too_short" }
  const headerSize = bytes[0]
  if (headerSize < 12 || headerSize > 64 || headerSize + 2 > bytes.byteLength) return { ok: false, reason: "invalid_header_size" }
  if (bytes[8] !== 0x2e || bytes[9] !== 0x46 || bytes[10] !== 0x49 || bytes[11] !== 0x54) return { ok: false, reason: "invalid_fit_signature" }
  const dataSize = u32le(bytes, 4); const dataEnd = headerSize + dataSize
  if (dataSize === 0 || dataEnd + 2 > bytes.byteLength) return { ok: false, reason: "invalid_data_size" }
  const stored = bytes[dataEnd] | (bytes[dataEnd + 1] << 8)
  if (stored !== crc16(bytes, 0, dataEnd)) return { ok: false, reason: "invalid_crc" }
  return { ok: true, headerSize, dataSize }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405)
  const auth = request.headers.get("Authorization")
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401)
  const contentLength = Number(request.headers.get("Content-Length") ?? "0")
  if (contentLength > MAX_BYTES) return json({ error: "file_too_large" }, 413)
  const raw = new Uint8Array(await request.arrayBuffer())
  const checked = validate(raw)
  if (!checked.ok) return json({ error: checked.reason }, 400)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  if (!supabaseUrl || !supabaseKey) return json({ error: "function_configuration_failed" }, 500)
  const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: auth } } })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401)
  const ownerId = userData.user.id
  const digest = await sha256(raw)
  const path = `${ownerId}/${digest}.fit`
  const filename = (request.headers.get("x-filename") ?? "activity.fit").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255) || "activity.fit"
  const upload = await supabase.storage.from("fit-files").upload(path, raw, { contentType: "application/octet-stream", upsert: false })
  if (upload.error && !upload.error.message.toLowerCase().includes("already exists")) return json({ error: "storage_failed" }, 502)
  const insert = await supabase.from("activities").insert({ owner_id: ownerId, storage_path: path, original_filename: filename, raw_sha256: digest, file_size_bytes: raw.byteLength, analysis_status: "validated" }).select("id,raw_sha256,file_size_bytes,analysis_status").single()
  if (insert.error) {
    if (insert.error.code === "23505") return json({ error: "duplicate_activity" }, 409)
    return json({ error: "database_failed" }, 502)
  }
  return json({ activity: insert.data, fit: { headerSize: checked.headerSize, dataSize: checked.dataSize } }, 201)
})
