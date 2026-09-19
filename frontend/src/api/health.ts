import { getApiBaseUrl } from './config'

export type HealthProbe = {
  id: number
  last_seen_at: string
  source: string
  detail?: string | null
}

export type HealthResponse = {
  status: 'ok' | 'error'
  service: string
  database: 'connected' | 'unavailable'
  probe?: HealthProbe | null
  detail?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (!isRecord(value)) {
    return false
  }
  return (
    (value.status === 'ok' || value.status === 'error') &&
    typeof value.service === 'string' &&
    (value.database === 'connected' || value.database === 'unavailable')
  )
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/health`, {
    headers: { Accept: 'application/json' },
  })

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error(`Health check failed (${response.status})`)
  }

  if (!isHealthResponse(payload)) {
    throw new Error('Health check returned an unexpected payload')
  }

  return payload
}
