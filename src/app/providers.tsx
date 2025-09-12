/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useState } from 'react'

// Updated chain definition for Pepu Mainnet
const pepuMainnet = {
  id: 97741,  // Changed from 97740 to 97741
  name: 'Pepu Mainnet',  // Changed from 'Pepu Testnet'
  nativeCurrency: { 
    name: 'Pepu',
    symbol: 'PEPU', 
    decimals: 18 
  },
  rpcUrls: { 
    default: { http: ['/api/rpc'] } 
  },
  blockExplorers: { 
    default: { 
      name: 'Pepu Explorer', 
      url: 'https://explorer-pepu-v2-mainnet-O.t.conduit.xyz'  // Updated explorer URL
    } 
  },
  testnet: false,  // Changed from true to false
} as any

const config = createConfig({
  chains: [pepuMainnet],  // Changed variable name
  connectors: [injected()],
  transports: { 
    [pepuMainnet.id]: http('/api/rpc', {  // Updated to use new chain ID
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
