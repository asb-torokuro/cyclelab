export const MAX_FIT_BYTES = 50 * 1024 * 1024
export type FitValidation = { ok: true; dataSize: number; headerSize: number; sha256: string } | { ok: false; reason: string }
export type FitRecord = { timestamp: number; powerW: number | null; heartRateBpm: number | null; cadenceRpm: number | null; distanceM: number | null; elevationM: number | null; latitude: number | null; longitude: number | null }

function u32le(bytes: Uint8Array, offset: number): number { return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24) }
function crc16(bytes: Uint8Array, start: number, end: number): number { let crc = 0; for (let i = start; i < end; i += 1) { let value = bytes[i]; for (let bit = 0; bit < 8; bit += 1) { const mix = (crc ^ value) & 1; crc >>>= 1; if (mix) crc ^= 0xA001; value >>>= 1 } } return crc & 0xffff }

export async function sha256Hex(bytes: Uint8Array): Promise<string> { const copy = new Uint8Array(bytes.byteLength); copy.set(bytes); const digest = await crypto.subtle.digest('SHA-256', copy.buffer); return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('') }

export async function validateFitBytes(bytes: Uint8Array): Promise<FitValidation> {
  if (bytes.byteLength > MAX_FIT_BYTES) return { ok: false, reason: 'ファイルサイズが上限（50 MiB）を超えています' }
  if (bytes.byteLength < 14) return { ok: false, reason: 'FITヘッダーが不足しています' }
  const headerSize = bytes[0]
  if (headerSize < 12 || headerSize > 64 || headerSize + 2 > bytes.byteLength) return { ok: false, reason: 'FITヘッダー長が不正です' }
  if (bytes[8] !== 0x2e || bytes[9] !== 0x46 || bytes[10] !== 0x49 || bytes[11] !== 0x54) return { ok: false, reason: 'FITシグネチャがありません' }
  const dataSize = u32le(bytes, 4) >>> 0
  const dataEnd = headerSize + dataSize
  if (dataSize === 0 || dataEnd + 2 > bytes.byteLength) return { ok: false, reason: 'FITデータ長が不正です' }
  const storedCrc = bytes[dataEnd] | (bytes[dataEnd + 1] << 8)
  const calculated = crc16(bytes, 0, dataEnd)
  if (storedCrc !== calculated) return { ok: false, reason: 'FIT CRC検証に失敗しました' }
  return { ok: true, dataSize, headerSize, sha256: await sha256Hex(bytes) }
}

export async function validateFitFile(file: File): Promise<FitValidation> { return validateFitBytes(new Uint8Array(await file.arrayBuffer())) }

type Definition = { architecture: number; globalMessage: number; fields: Array<{ number: number; size: number; baseType: number }> }
const FIT_EPOCH = Date.UTC(1989, 11, 31) / 1000

function readNumber(bytes: Uint8Array, offset: number, size: number, baseType: number, architecture: number): number | null {
  const invalid = baseType === 0x00 ? 0xff : baseType === 0x02 ? 0xffff : baseType === 0x83 ? 0x7fff : null
  if (size !== 1 && size !== 2 && size !== 4) return null
  let value = 0
  if (architecture === 0) { for (let i = size - 1; i >= 0; i -= 1) value = value * 256 + bytes[offset + i] } else { for (let i = 0; i < size; i += 1) value = value * 256 + bytes[offset + i] }
  if (invalid != null && value === invalid) return null
  if (baseType === 0x01 || baseType === 0x83 || baseType === 0x85) { const bits = size * 8; const sign = 2 ** (bits - 1); if (value >= sign) value -= 2 ** bits }
  return value
}

function fieldValue(number: number, raw: number | null): number | null {
  if (raw == null) return null
  if (number === 2 || number === 78) return raw / 5 + 500
  if (number === 5) return raw / 100
  if (number === 73) return raw / 1000
  if (number === 0 || number === 1) return raw * (180 / 2 ** 31)
  return raw
}

export function decodeFitRecords(bytes: Uint8Array): FitRecord[] {
  const checked = validateHeaderOnly(bytes); if (!checked.ok) return []
  const definitions = new Map<number, Definition>(); const records: FitRecord[] = []; let offset = checked.headerSize; const end = checked.headerSize + checked.dataSize
  while (offset < end) {
    const header = bytes[offset++]
    if (header & 0x80) { offset += 0; continue }
    const local = header & 0x0f
    if (header & 0x40) {
      if (offset + 5 > end) break
      const architecture = bytes[offset + 1]; const globalMessage = architecture === 0 ? bytes[offset + 2] | (bytes[offset + 3] << 8) : (bytes[offset + 2] << 8) | bytes[offset + 3]; const fieldCount = bytes[offset + 4]; offset += 5
      const fields: Definition['fields'] = []
      for (let i = 0; i < fieldCount; i += 1) { if (offset + 3 > end) return records; fields.push({ number: bytes[offset], size: bytes[offset + 1], baseType: bytes[offset + 2] & 0x1f }); offset += 3 }
      if (header & 0x20) { if (offset >= end) break; const developerCount = bytes[offset++]; offset += developerCount * 3 }
      definitions.set(local, { architecture, globalMessage, fields }); continue
    }
    const definition = definitions.get(local); if (!definition) break
    const values = new Map<number, number | null>()
    for (const field of definition.fields) { if (offset + field.size > end) return records; values.set(field.number, readNumber(bytes, offset, field.size, field.baseType, definition.architecture)); offset += field.size }
    if (definition.globalMessage !== 20) continue
    const timestamp = values.get(253); if (timestamp == null) continue
    records.push({ timestamp: FIT_EPOCH + timestamp, powerW: fieldValue(7, values.get(7) ?? null), heartRateBpm: fieldValue(3, values.get(3) ?? null), cadenceRpm: fieldValue(4, values.get(4) ?? null), distanceM: fieldValue(5, values.get(5) ?? null), elevationM: fieldValue(78, values.get(78) ?? values.get(2) ?? null), latitude: fieldValue(0, values.get(0) ?? null), longitude: fieldValue(1, values.get(1) ?? null) })
  }
  return records
}

function validateHeaderOnly(bytes: Uint8Array): { ok: true; dataSize: number; headerSize: number } | { ok: false } {
  if (bytes.byteLength < 14 || bytes[0] < 12 || bytes[0] > 64 || bytes[8] !== 0x2e || bytes[9] !== 0x46 || bytes[10] !== 0x49 || bytes[11] !== 0x54) return { ok: false }
  const dataSize = u32le(bytes, 4); if (!dataSize || bytes[0] + dataSize + 2 > bytes.byteLength) return { ok: false }
  return { ok: true, headerSize: bytes[0], dataSize }
}
