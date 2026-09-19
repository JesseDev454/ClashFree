export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? ''
  return raw.replace(/\/$/, '')
}
