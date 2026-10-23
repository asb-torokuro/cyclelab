import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
describe('profile migration security contract', () => {
  it('keeps RLS and explicit delete denial in migrations', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/202610230001_profiles.sql'), 'utf8') + readFileSync(resolve(process.cwd(), 'supabase/migrations/202610230002_phase3_hardening.sql'), 'utf8')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('auth.uid()')
    expect(sql).toContain('revoke delete')
    expect(sql).toContain('grant select, insert, update')
  })
})
