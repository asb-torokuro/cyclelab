const allowedPaths = new Set(['/login', '/signup', '/check-email', '/forgot-password', '/reset-password', '/dashboard'])

export function safePath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  const path = value.split(/[?#]/, 1)[0]
  return allowedPaths.has(path) ? path : fallback
}

export function publicAuthError() {
  return '入力内容を確認できませんでした。メールアドレスまたはパスワードを確認して、もう一度お試しください。'
}
