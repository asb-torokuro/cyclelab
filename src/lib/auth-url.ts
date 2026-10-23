const fallbackOrigin = 'https://cyclelab.vercel.app'

export function authRedirect(path: '/login' | '/reset-password') {
  const configured = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.trim()
  const candidate = configured || (import.meta.env.PROD ? fallbackOrigin : window.location.origin)
  try {
    const url = new URL(candidate)
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('invalid auth origin')
    return `${url.origin}${path}`
  } catch {
    return `${fallbackOrigin}${path}`
  }
}
