import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { FormMessage } from '../components/FormMessage'
import { validateFitFile } from '../lib/fit'
import { supabase } from '../lib/supabase'

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function importFit() {
    if (!file || !supabase) return
    setBusy(true); setMessage(''); setSuccess(false)
    try {
      if (file.size > 50 * 1024 * 1024) { setMessage('ファイルサイズが上限（50 MiB）を超えています。'); return }
      const checked = await validateFitFile(file)
      if (!checked.ok) { setMessage(checked.reason); return }
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) { setMessage('セッションがありません。再ログインしてください。'); return }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-fit`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream', 'X-Filename': file.name }, body: await file.arrayBuffer() })
      if (response.status === 409) { setMessage('同じFITファイルは既に取り込み済みです。'); return }
      if (!response.ok) {
        let serverError = ''
        try { const body = await response.json() as { error?: string }; serverError = body.error ?? '' } catch { /* 非JSON応答は一般メッセージへ */ }
        const reasons: Record<string, string> = { invalid_crc: 'FITのCRC検証に失敗しました。ファイルを再エクスポートしてください。', invalid_fit_signature: 'FITシグネチャがありません。FIT形式のファイルを選択してください。', invalid_data_size: 'FITデータ長が不正です。ファイルが破損している可能性があります。', header_too_short: 'FITヘッダーが不足しています。ファイルが破損している可能性があります。', file_too_large: 'ファイルサイズが上限（50 MiB）を超えています。', storage_failed: 'FITの保存先に接続できませんでした。時間をおいて再試行してください。', database_failed: '活動記録の保存に失敗しました。時間をおいて再試行してください。' }
        setMessage(reasons[serverError] ?? 'FITの取り込みに失敗しました。ファイルと接続を確認してください。'); return
      }
      setSuccess(true); setMessage('FITを検証し、非公開Storageへ保存しました。活動記録で確認できます。')
    } catch { setMessage('通信またはFIT検証に失敗しました。再試行してください。') } finally { setBusy(false) }
  }

  return <AppShell><main className="dashboard-content"><p className="eyebrow">FIT IMPORT</p><h1>ライドデータを、<br /><em>安全に取り込む。</em></h1><p className="body-copy">最大50 MiBのFITを検証し、あなた専用の非公開Storageへ保存します。ファイル名や拡張子だけでは判定しません。</p><section className="profile-card" aria-labelledby="fit-title"><div><p className="card-label">UPLOAD</p><h2 id="fit-title">FITファイルを選択</h2></div><label>FITファイル<input type="file" accept=".fit,application/octet-stream" onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(''); setSuccess(false) }} /></label>{file && <p className="muted">{file.name} / {(file.size / 1024 / 1024).toFixed(2)} MiB</p>}<button onClick={() => void importFit()} disabled={!file || busy}>{busy ? '検証・保存中…' : 'FITを取り込む'}</button>{message && <FormMessage tone={success ? 'success' : 'error'}>{message}</FormMessage>}{success && <Link className="button" to="/activities">活動記録を見る</Link>}</section></main></AppShell>
}
