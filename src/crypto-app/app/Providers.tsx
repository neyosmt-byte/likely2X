import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type PropsWithChildren } from 'react'
import { Toaster } from 'sonner'

import { TooltipProvider } from '../components/ui/index.ts'
import { CryptoThemeProvider } from './theme.tsx'

export function SnapshotReleaseObserver() { return null }

export function CryptoAppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }))
  return <QueryClientProvider client={queryClient}><CryptoThemeProvider><TooltipProvider delayDuration={250}>{children}</TooltipProvider><Toaster richColors position="bottom-right" theme="system" /></CryptoThemeProvider></QueryClientProvider>
}
