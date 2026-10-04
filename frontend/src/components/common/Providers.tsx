'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserStore } from '../../store/userStore';
import { getStoredToken } from '../../lib/api';

import ToastNotification from './ToastNotification';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10, // 10 minutes cache freshness for instant tab switching
        gcTime: 1000 * 60 * 60,    // Keep data in cache for 1 hour
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
      },
    },
  }));

  const initialize = useUserStore(state => state.initialize);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const runInit = async () => {
      await initialize();
      // If user isn't authenticated yet but we still have a token in localStorage,
      // retry once after 2.5 seconds in case backend was cold-starting or waking up from sleep
      const state = useUserStore.getState();
      const token = getStoredToken();
      if (!state.user && token) {
        timeoutId = setTimeout(() => {
          initialize();
        }, 2500);
      }
    };

    runInit();

    // Unregister any active service workers to clear cache cycle
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastNotification />
    </QueryClientProvider>
  );
}
