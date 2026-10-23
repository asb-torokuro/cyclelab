import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth(); const navigate = useNavigate()
  async function logout() { const { error } = await signOut(); if (!error) navigate('/login', { replace: true }) }
  return <div className="app-shell"><header className="topbar"><Link className="brand" to="/dashboard"><span className="brand-mark">↗</span> CycleLab</Link><nav aria-label="メインナビゲーション"><Link className="nav-link" to="/dashboard">ダッシュボード</Link><Link className="nav-link" to="/import">FIT取込</Link><button className="text-button" onClick={logout}>ログアウト</button></nav></header>{children}</div>
}
