"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

const CAREGIVER_SYNC_INTERVAL_MS = 30_000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            // How another caregiver's entries reach this screen: every query
            // refetches while the tab is visible and when it regains focus.
            refetchInterval: CAREGIVER_SYNC_INTERVAL_MS,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider queryClient={queryClient}>
          {children}
          <Toaster />
        </TRPCProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
