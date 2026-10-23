export type Sample = {
  timestamp: number
  powerW?: number | null
  heartRateBpm?: number | null
  cadenceRpm?: number | null
  distanceM?: number | null
  elevationM?: number | null
}

export type MetricResult = { value: number | null; reason?: string }

const unavailable = (reason: string): MetricResult => ({ value: null, reason })
const finite = (value: number | null | undefined): value is number => value != null && Number.isFinite(value)

export function elapsedSeconds(samples: Sample[]): MetricResult {
  if (samples.length < 2) return unavailable('サンプルが2点未満です')
  const first = samples[0].timestamp; const last = samples[samples.length - 1].timestamp
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return unavailable('時刻が単調増加していません')
  return { value: last - first }
}

export function distanceMeters(samples: Sample[]): MetricResult {
  const values = samples.map(s => s.distanceM).filter(finite)
  if (values.length < 2) return unavailable('距離データがありません')
  const delta = values[values.length - 1] - values[0]
  return delta >= 0 ? { value: delta } : unavailable('距離が減少しています')
}

export function meanSpeedMps(samples: Sample[]): MetricResult {
  const distance = distanceMeters(samples); const elapsed = elapsedSeconds(samples)
  if (distance.value == null || elapsed.value == null || elapsed.value <= 0) return unavailable('速度の入力が不足しています')
  return { value: distance.value / elapsed.value }
}

export function elevationGainMeters(samples: Sample[], deadbandM = 1): MetricResult {
  const elevations = samples.map(s => s.elevationM).filter(finite)
  if (elevations.length < 2) return unavailable('標高データがありません')
  let gain = 0
  for (let i = 1; i < elevations.length; i += 1) { const delta = elevations[i] - elevations[i - 1]; if (delta > deadbandM) gain += delta }
  return { value: gain }
}

export function validPower(samples: Sample[]): number[] { return samples.map(s => s.powerW).filter((v): v is number => finite(v) && v >= 0 && v <= 65535) }

export function meanMaxPower(samples: Sample[], durationSeconds: number): MetricResult {
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) return unavailable('継続時間が不正です')
  const points = samples.filter(s => finite(s.powerW) && s.powerW! >= 0 && s.powerW! <= 65535)
  if (points.length < 2) return unavailable('パワーデータがありません')
  let best = -Infinity
  for (let start = 0; start < points.length; start += 1) {
    let sum = 0; let count = 0
    for (let end = start; end < points.length && points[end].timestamp - points[start].timestamp < durationSeconds; end += 1) { sum += points[end].powerW!; count += 1 }
    if (count > 0 && points[start + count - 1].timestamp - points[start].timestamp >= durationSeconds - 1) best = Math.max(best, sum / count)
  }
  return Number.isFinite(best) ? { value: best } : unavailable('連続した有効パワー区間が不足しています')
}

export function wattsPerKg(powerW: number | null, massKg: number | null): MetricResult {
  if (!finite(powerW) || !finite(massKg) || massKg <= 0 || powerW < 0) return unavailable('パワーまたは体重が不正です')
  return { value: powerW / massKg }
}

export function normalizedPower(samples: Sample[]): MetricResult {
  const points = samples.filter(s => finite(s.powerW) && s.powerW! >= 0 && s.powerW! <= 65535)
  if (points.length < 2) return unavailable('パワーデータがありません')
  const fourth: number[] = []
  for (let i = 0; i < points.length; i += 1) {
    const start = points[i].timestamp
    const window = points.filter(p => p.timestamp >= start && p.timestamp < start + 30)
    if (window.length && window[window.length - 1].timestamp - start >= 29) { const avg = window.reduce((sum, p) => sum + p.powerW!, 0) / window.length; fourth.push(avg ** 4) }
  }
  if (!fourth.length) return unavailable('30秒以上の連続パワーデータがありません')
  return { value: (fourth.reduce((a, b) => a + b, 0) / fourth.length) ** 0.25 }
}

export function intensityFactor(np: number | null, ftp: number | null): MetricResult {
  if (!finite(np) || !finite(ftp) || ftp <= 0 || np < 0) return unavailable('NPまたはFTPが不足しています')
  return { value: np / ftp }
}

export function trainingStressScore(durationSeconds: number | null, np: number | null, ftp: number | null): MetricResult {
  const ifResult = intensityFactor(np, ftp)
  if (!finite(durationSeconds) || durationSeconds <= 0 || np == null || ftp == null || ifResult.value == null) return unavailable('TSSの入力が不足しています')
  return { value: durationSeconds * np * ifResult.value / (ftp * 3600) * 100 }
}

export function ewma(previous: number, load: number, timeConstantDays: number): number {
  if (!Number.isFinite(previous) || !Number.isFinite(load) || !Number.isFinite(timeConstantDays) || timeConstantDays <= 0) return Number.NaN
  return previous + (load - previous) / timeConstantDays
}

export function trainingLoad(loadsByDay: number[], ctlDays = 42, atlDays = 7): { ctl: number; atl: number; tsb: number } {
  let ctl = 0; let atl = 0
  for (const load of loadsByDay) { ctl = ewma(ctl, load, ctlDays); atl = ewma(atl, load, atlDays) }
  return { ctl, atl, tsb: ctl - atl }
}
