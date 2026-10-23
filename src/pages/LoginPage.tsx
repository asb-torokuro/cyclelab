import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { FormMessage } from '../components/FormMessage'
import { useAuth } from '../lib/auth'
import { publicAuthError, safePath } from '../lib/security'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const navigate = useNavigate(); const location = useLocation(); const { user } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  if (user) { navigate('/dashboard', { replace: true }); return null }
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); if (!supabase) { setError('Supabaseの接続設定が未完了です。管理者に設定を依頼してください。'); return } setBusy(true); const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setBusy(false); if (authError || !data.user || !data.session) { setError(publicAuthError()); return } if (!data.user.email_confirmed_at) { await supabase.auth.signOut(); setError('メールアドレスの確認が必要です。受信トレイをご確認ください。'); return } navigate(safePath((location.state as { from?: string } | null)?.from)) }
  return <AuthLayout eyebrow="SECURE ACCESS" title="走りを、正しく記録する。"><p className="lead">CycleLabへログイン</p><form onSubmit={submit} noValidate><label>メールアドレス<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>パスワード<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <FormMessage>{error}</FormMessage>}<button disabled={busy}>{busy ? '確認中…' : 'ログイン'}</button></form><div className="link-row"><Link to="/forgot-password">パスワードを忘れた方</Link><Link to="/signup">新規登録</Link></div></AuthLayout>
}
