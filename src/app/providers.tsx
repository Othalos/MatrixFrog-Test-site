/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { useState, useEffect } from 'react'
import { pepuMainnet, PEPE_UNCHAINED_CHAIN_ID } from './lib/chains'

const config = createConfig({
  chains: [pepuMainnet as any],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId: "efce48a19d0c7b8b8da21be2c1c8c271",
      metadata: {
        name: 'MatrixFrog',
        description: 'MatrixFrog Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
        icons: ['https://via.placeholder.com/128x128.png?text=MF']
      },
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'MatrixFrog',
      appLogoUrl: 'https://via.placeholder.com/128x128.png?text=MF',
    }),
  ],
  transports: { 
    [PEPE_UNCHAINED_CHAIN_ID]: http('/api/rpc', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    })
  },
  batch: { multicall: true },
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // Verhindere SSR/Hydration-Probleme
  useEffect(() => {
    setMounted(true)
  }, [])

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { 
      queries: { 
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
      } 
    }
  }))

  // Render nichts bis Client-side mounting abgeschlossen ist
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config as any} reconnectOnMount={true}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  )
}