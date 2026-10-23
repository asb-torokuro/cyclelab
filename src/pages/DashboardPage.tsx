import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormMessage } from '../components/FormMessage'
import { AppShell } from '../components/AppShell'
import { useAuth } from '../lib/auth'
import { loadOrCreateProfile, updateProfile, type Profile } from '../lib/profile'
export function DashboardPage() {
  const navigate = useNavigate(); const { user, error: authError } = useAuth(); const [profile, setProfile] = useState<Profile | null>(null); const [name, setName] = useState(''); const [busy, setBusy] = useState(true); const [saving, setSaving] = useState(false); const [message, setMessage] = useState('')
  const load = useCallback(async () => { if (!user) return; setBusy(true); setMessage(''); try { const p = await loadOrCreateProfile(); setProfile(p); setName(p.display_name ?? '') } catch { setMessage('プロフィールを読み込めませんでした。再試行してください。') } finally { setBusy(false) } }, [user])
  useEffect(() => { void load() }, [load])
  async function save() { setSaving(true); setMessage(''); try { const p = await updateProfile(name); setProfile(p); setName(p.display_name ?? ''); setMessage('プロフィールを保存しました。') } catch { setMessage('プロフィールを保存できませんでした。入力内容を確認して再試行してください。') } finally { setSaving(false) } }
  if (!user) return null
  return <AppShell><main className="dashboard-content"><p className="eyebrow">PRIVATE DASHBOARD</p><h1>今日のライドを、<br /><em>次の一歩</em>へ。</h1><p className="body-copy">認証とプロフィールの最小機能が有効です。ライド分析は今後のPhaseで追加します。</p>{authError && <FormMessage>{authError}</FormMessage>}<section className="profile-card" aria-labelledby="profile-title"><div><p className="card-label">PROFILE</p><h2 id="profile-title">あなたのプロフィール</h2></div>{busy ? <p aria-live="polite">読み込み中…</p> : profile ? <><label>表示名<input maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="表示名（任意）" /></label><button onClick={save} disabled={saving}>{saving ? '保存中…' : 'プロフィールを保存'}</button></> : <><FormMessage>{message || 'プロフィールを表示できませんでした。'}</FormMessage><button onClick={() => void load()}>再試行</button></>}{message && profile && <FormMessage tone={message.includes('保存しました') ? 'success' : 'error'}>{message}</FormMessage>}{message.includes('保存しました') && <button type="button" onClick={() => navigate('/import')}>FIT取込へ進む</button>}</section><p className="muted">アカウント: {user.email ?? '確認済みユーザー'}</p></main></AppShell>
}
