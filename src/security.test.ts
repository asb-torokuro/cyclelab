import { describe, expect, it } from 'vitest'
import { publicAuthError, safePath } from './lib/security'
describe('security guards', () => {
  it('allows only known internal routes', () => { expect(safePath('/dashboard')).toBe('/dashboard'); expect(safePath('/login?next=https://evil.example')).toBe('/login') })
  it('rejects external and protocol-relative redirects', () => { expect(safePath('https://evil.example')).toBe('/dashboard'); expect(safePath('//evil.example')).toBe('/dashboard'); expect(safePath('/not-allowed')).toBe('/dashboard') })
  it('uses an account-enumeration-resistant auth message', () => { expect(publicAuthError()).not.toMatch(/存在|登録|未登録|アカウント/) })
})
