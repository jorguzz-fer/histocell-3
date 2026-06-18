const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any))
    const msg = Array.isArray(body.message)
      ? body.message.join('; ')
      : body.message ?? `Erro ${res.status}`
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

/** API pública do portal (acesso por token, sem login). */
export const portalApi = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
}
