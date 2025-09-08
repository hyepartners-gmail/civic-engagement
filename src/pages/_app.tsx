import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '../components/ui/toaster';
import { TooltipProvider } from '../components/ui/tooltip';
import { AppProviders } from '../contexts/AppProviders';
import '../globals.css';

// Create the client once outside the component to avoid issues during build.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
    },
  },
});

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session} refetchInterval={2 * 60}>
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <TooltipProvider>
            <Toaster />
            <Component {...pageProps} />
          </TooltipProvider>
        </AppProviders>
      </QueryClientProvider>
    </SessionProvider>
  );
}

export default MyApp;