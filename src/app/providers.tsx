'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useState } from 'react'

// Use a plain object for the chain to avoid defineChain type conflicts
const pepuTestnet = {
  id: 97740,
  name: 'Pepu Testnet',
  nativeCurrency: { 
    name: 'Pepu', // Changed from 'PEPU' to 'Pepu' to match expected type
    symbol: 'PEPU', 
    decimals: 18 
  },
  rpcUrls: { 
    default: { http: ['/api/rpc'] } 
  },
  blockExplorers: { 
    default: { 
      name: 'Pepu Explorer', 
      url: 'https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz' 
    } 
  },
  testnet: true,
} as const

const config = createConfig({
  chains: [pepuTestnet as any], // Type assertion to bypass conflicts
  connectors: [injected()],
  transports: { 
    [pepuTestnet.id]: http('/api/rpc', {
      batch: true,
      retryCount: 2,
    })
  },
  batch: { multicall: true },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { 
      queries: { 
        retry: false, 
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      } 
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config as any}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}
