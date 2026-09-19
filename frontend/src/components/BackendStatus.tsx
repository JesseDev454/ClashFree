import { useHealth } from '../hooks/useHealth'

export function BackendStatus() {
  const { data, isPending, isError } = useHealth()
  const connected = data?.status === 'ok' && data.database === 'connected'

  let label = 'Checking API'
  if (!isPending && (isError || !connected)) {
    label = 'API unreachable'
  } else if (connected) {
    label = 'API connected'
  }

  return <span data-testid="backend-status">{label}</span>
}
