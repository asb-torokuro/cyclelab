import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { FormMessage } from '../components/FormMessage'
import { authRedirect } from '../lib/auth-url'
import { supabase } from '../lib/supabase'
export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState('')
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); const normalizedEmail = email.trim(); if (!supabase) { setError('Supabaseの接続設定が未完了です。'); return } if (!normalizedEmail) { setError('メールアドレスを入力してください。'); return } setBusy(true); try { const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: authRedirect('/reset-password') }); if (authError) { const message = authError.message.toLowerCase(); setError(message.includes('redirect') ? '本番URLの許可設定が未完了です。管理者設定を確認してください。' : '現在、再設定申請を完了できません。時間をおいて再試行してください。') } else setSent(true) } catch { setError('現在、再設定申請を完了できません。時間をおいて再試行してください。') } finally { setBusy(false) } }
  return <AuthLayout eyebrow="ACCOUNT RECOVERY" title="パスワードを再設定"><p className="lead">登録情報を確認して、安全なリンクを送ります。</p>{sent ? <FormMessage tone="success">入力されたアドレスに、該当する場合は再設定用の案内を送信しました。メールをご確認ください。</FormMessage> : <form onSubmit={submit} noValidate><label>メールアドレス<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>{error && <FormMessage>{error}</FormMessage>}<button disabled={busy}>{busy ? '送信中…' : '再設定メールを送る'}</button></form>}<div className="link-row"><Link to="/login">ログインへ戻る</Link></div></AuthLayout>
}
