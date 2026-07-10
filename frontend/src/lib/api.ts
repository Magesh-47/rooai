const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail ?? `API error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
