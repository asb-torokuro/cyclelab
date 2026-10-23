import type { ReactNode } from 'react'

export function FormMessage({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' | 'info' }) {
  return <div className={`message ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}
