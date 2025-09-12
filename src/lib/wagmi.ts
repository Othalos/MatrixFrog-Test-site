import { http, createConfig } from 'wagmi'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define the Pepu mainnet chain
const pepuMainnet = defineChain({
  id: 97741,  // Changed from 97740
  name: 'Pepu Mainnet',  // Changed from 'Pepu Testnet'
  nativeCurrency: {
    decimals: 18,
    name: 'Pepu',
    symbol: 'PEPU',
  },
  rpcUrls: {
    default: {
      http: ['/api/rpc'], // Use your internal proxy
    },
    public: {
      http: ['/api/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Pepu Explorer',
      url: 'https://explorer-pepu-v2-mainnet-0.t.conduit.xyz',  // Updated to mainnet explorer
    },
  },
  testnet: false,  // Changed from true
})

export const config = createConfig({
  chains: [pepuMainnet],  // Updated variable name
  connectors: [
    injected(),
    walletConnect({ 
      projectId: 'efce48a19d0c7b8b8da21be2c1c8c271',
      showQrModal: true 
    }),
    coinbaseWallet({ 
      appName: 'MatrixFrog',
      appLogoUrl: 'https://matrixfrog.one/logo.png'
    }),
  ],
  transports: {
    [pepuMainnet.id]: http('/api/rpc', {  // Updated to use mainnet chain ID
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  batch: {
    multicall: true,
  },
  pollingInterval: 4_000,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
