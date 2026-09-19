import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchHealth, isHealthResponse } from './health'

const okBody = {
  status: 'ok',
  service: 'clashfree-api',
  database: 'connected',
  probe: {
    id: 1,
    last_seen_at: '2026-09-18T15:00:00+00:00',
    source: 'health-endpoint',
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchHealth', () => {
  it('returns a parsed health payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(okBody), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await expect(fetchHealth()).resolves.toEqual(okBody)
  })

  it('rejects unknown JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await expect(fetchHealth()).rejects.toThrow(/unexpected payload/i)
  })
})

describe('isHealthResponse', () => {
  it('accepts ok and error envelopes', () => {
    expect(isHealthResponse(okBody)).toBe(true)
    expect(
      isHealthResponse({
        status: 'error',
        service: 'clashfree-api',
        database: 'unavailable',
      }),
    ).toBe(true)
    expect(isHealthResponse(null)).toBe(false)
  })
})
