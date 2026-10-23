export const MAX_FIT_BYTES = 50 * 1024 * 1024
export type FitValidation = { ok: true; dataSize: number; headerSize: number; sha256: string } | { ok: false; reason: string }

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
