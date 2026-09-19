import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BackendStatus } from './BackendStatus'

function renderStatus() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <BackendStatus />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BackendStatus', () => {
  it('reports a successful health check', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'ok',
            service: 'clashfree-api',
            database: 'connected',
            probe: {
              id: 1,
              last_seen_at: '2026-09-18T15:00:00+00:00',
              source: 'health-endpoint',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    renderStatus()
    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('API connected')
    })
  })

  it('reports an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    renderStatus()
    await waitFor(() => {
      expect(screen.getByTestId('backend-status')).toHaveTextContent('API unreachable')
    })
  })
})
