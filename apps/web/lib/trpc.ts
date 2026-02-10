import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import type { AppRouter } from '@threadscope/api/trpc';
import { getAccessToken } from './auth';

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        credentials: 'include',
        headers() {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
