export function authRedirect(path: '/login' | '/reset-password') {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim()
  // Runtime browser origin is authoritative; it prevents stale build-time values
  // from sending production auth links back to localhost.
  const candidate = (typeof window !== 'undefined' ? window.location.origin : configured) || 'https://cyclelab.vercel.app'
  try {
    const url = new URL(candidate)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const isProduction = url.hostname === 'cyclelab.vercel.app'
    if ((!isLocal && !isProduction) || (isLocal && import.meta.env.PROD) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('invalid auth origin')
    return `${url.origin}${path}`
  } catch {
    return `${configured || 'https://cyclelab.vercel.app'}${path}`
  }
}
