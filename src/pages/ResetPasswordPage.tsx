import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { FormMessage } from '../components/FormMessage'
import { supabase } from '../lib/supabase'
export function ResetPasswordPage() {
  const navigate = useNavigate(); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!supabase) { setError('Supabaseの接続設定が未完了です。'); return }
    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (active && (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION')) setReady(Boolean(session)) })
    void supabase.auth.getSession().then(({ data, error: authError }) => { if (!active) return; if (authError || !data.session) setError('再設定リンクが無効または期限切れです。'); else setReady(true) }).catch(() => active && setError('再設定リンクを確認できませんでした。'))
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); if (password.length < 8 || password !== confirm) { setError('パスワードは8文字以上で、確認欄と一致させてください。'); return } if (!supabase || !ready) return; setBusy(true); try { const { error: authError } = await supabase.auth.updateUser({ password }); if (authError) { setError('パスワードを更新できませんでした。リンクを再発行してください。'); return } await supabase.auth.signOut(); navigate('/login', { replace: true }) } catch { setError('パスワードを更新できませんでした。リンクを再発行してください。') } finally { setBusy(false) } }
  return <AuthLayout eyebrow="SECURE RESET" title="新しいパスワード"><p className="lead">新しいパスワードを設定してください。</p>{ready ? <form onSubmit={submit} noValidate><label>新しいパスワード<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><label>パスワード（確認）<input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>{error && <FormMessage>{error}</FormMessage>}<button disabled={busy}>{busy ? '更新中…' : 'パスワードを更新'}</button></form> : error && <FormMessage>{error}</FormMessage>}<div className="link-row"><Link to="/forgot-password">再設定メールを再送する</Link></div></AuthLayout>
}
