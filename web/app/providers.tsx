'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Products are expensive to fetch from Apps Script — cache aggressively.
            // The Refresh-from-Odoo button explicitly invalidates the cache.
            staleTime: 10 * 60 * 1000,        // 10 min
            gcTime:    60 * 60 * 1000,        // 1 hour
            refetchOnWindowFocus: false,
            retry: 1
          }
        }
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
