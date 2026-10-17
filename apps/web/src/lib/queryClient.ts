import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2, refetchOnWindowFocus: false },
    // Writes are never retried automatically (docs/ARCHITECTURE.md §12).
    mutations: { retry: false },
  },
});
