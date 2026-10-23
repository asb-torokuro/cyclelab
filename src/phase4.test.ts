import { describe, expect, it } from 'vitest'
import { elapsedSeconds, intensityFactor, meanMaxPower, trainingLoad, trainingStressScore, wattsPerKg } from './lib/analysis'
import { validateFitBytes } from './lib/fit'

describe('phase 4 deterministic metrics', () => {
  it('computes basic power metrics', () => {
    const samples = Array.from({ length: 61 }, (_, timestamp) => ({ timestamp, powerW: 200, distanceM: timestamp * 10 }))
    expect(elapsedSeconds(samples).value).toBe(60)
    expect(meanMaxPower(samples, 60).value).toBe(200)
    expect(wattsPerKg(240, 60).value).toBe(4)
  })
  it('returns unavailable for insufficient NP/TSS inputs', () => {
    expect(intensityFactor(null, 250).value).toBeNull()
    expect(trainingStressScore(20, 250, null).value).toBeNull()
  })
  it('computes a known TSS and EWMA sequence', () => {
    expect(trainingStressScore(3600, 250, 250).value).toBe(100)
    const load = trainingLoad([100, 0], 2, 2)
    expect(load.ctl).toBe(25)
    expect(load.atl).toBe(25)
    expect(load.tsb).toBe(0)
  })
  it('rejects malformed FIT bytes before parsing', async () => {
    const result = await validateFitBytes(new Uint8Array(20))
    expect(result.ok).toBe(false)
  })
})
