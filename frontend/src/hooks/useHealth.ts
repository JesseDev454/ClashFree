import { useQuery } from '@tanstack/react-query'
import { fetchHealth } from '../api/health'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: false,
    refetchInterval: 30_000,
    staleTime: 10_000,
  })
}
