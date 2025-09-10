'use client'

import { ReactNode } from 'react'
import { WagmiProvider as WagmiProviderBase } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '../../lib/wagmi'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 30_000, // 30 seconds
    },
  },
})

interface WagmiProviderProps {
  children: ReactNode
}

export function WagmiProvider({ children }: WagmiProviderProps) {
  return (
    <WagmiProviderBase config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProviderBase>
  )
}
