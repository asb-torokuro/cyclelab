import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function ProtectedRoute() {
  const { loading, user } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center-state" aria-live="polite">認証状態を確認しています…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
