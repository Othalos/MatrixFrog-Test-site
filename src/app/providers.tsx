'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defineChain } from 'viem'
import { useState } from 'react'

const pepuTestnet = defineChain({
  id: 97740,
  name: 'Pepu Testnet',
  nativeCurrency: { name: 'PEPU', symbol: 'PEPU', decimals: 18 },
  rpcUrls: { default: { http: ['/api/rpc'] } },
  blockExplorers: { default: { name: 'Pepu Explorer', url: 'https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz' } },
  testnet: true,
})

const config = createConfig({
  chains: [pepuTestnet],
  connectors: [injected()],
  transports: { [pepuTestnet.id]: http('/api/rpc') },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
