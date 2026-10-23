import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { FormMessage } from '../components/FormMessage'
import { listActivities, type Activity } from '../lib/activities'

function formatDuration(seconds: number | null) { if (seconds == null) return '算出不可'; const minutes = Math.round(seconds / 60); return `${Math.floor(minutes / 60)}時間${minutes % 60}分` }
function formatDistance(meters: number | null) { return meters == null ? '算出不可' : `${(meters / 1000).toFixed(1)} km` }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString('ja-JP') : '日時未取得' }
function metric(value: number | null, unit = '') { return value == null ? '算出不可' : `${value.toFixed(1)}${unit}` }

export function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]); const [busy, setBusy] = useState(true); const [error, setError] = useState('')
  const load = useCallback(async () => { setBusy(true); setError(''); try { setActivities(await listActivities()) } catch { setError('活動記録を読み込めませんでした。再試行してください。') } finally { setBusy(false) } }, [])
  useEffect(() => { void load() }, [load])
  return <AppShell><main className="dashboard-content"><p className="eyebrow">ACTIVITY LOG</p><h1>取り込んだ<br /><em>活動記録。</em></h1><p className="body-copy">FIT取込済みの活動と、FTPに基づく決定論的な分析結果を確認できます。</p><div className="page-actions"><Link className="button" to="/import">FITを追加</Link><Link className="button secondary" to="/training">トレーニング設定</Link></div>{error && <FormMessage>{error}</FormMessage>}{busy ? <p aria-live="polite">読み込み中…</p> : activities.length === 0 ? <section className="empty-card"><h2>まだ活動記録がありません</h2><p>FITファイルを取り込むと、ここに活動が表示されます。</p><Link className="button" to="/import">最初のFITを取り込む</Link></section> : <section className="activity-list" aria-label="活動記録一覧">{activities.map(activity => <article className="activity-card" key={activity.id}><div className="activity-card-head"><div><p className="card-label">{activity.analysis_status === 'analyzed' ? 'ANALYZED' : 'IMPORTED'}</p><h2>{activity.original_filename}</h2></div><time>{formatDate(activity.started_at ?? activity.created_at)}</time></div><div className="metric-grid"><span><b>時間</b>{formatDuration(activity.elapsed_time_s)}</span><span><b>距離</b>{formatDistance(activity.distance_m)}</span><span><b>NP</b>{metric(activity.normalized_power_w, ' W')}</span><span><b>IF</b>{metric(activity.intensity_factor)}</span><span><b>TSS</b>{metric(activity.tss)}</span><span><b>W/kg</b>{metric(activity.watts_per_kg)}</span></div>{activity.tss == null && <p className="muted">FTP設定または30秒以上の有効パワーが不足しているため、負荷指標は算出不可です。</p>}</article>)}</section>}</main></AppShell>
}
