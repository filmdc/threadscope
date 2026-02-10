import { trpc } from '@/lib/trpc';

export function useConnectionStatus() {
  return trpc.dashboard.connectionStatus.useQuery(undefined, {
    staleTime: 60 * 1000,
    retry: false,
  });
}
