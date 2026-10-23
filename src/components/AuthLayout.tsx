import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function AuthLayout({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return <main className="auth-shell"><section className="auth-panel"><Link className="brand" to="/login"><span className="brand-mark">↗</span> CycleLab</Link><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section></main>
}
