"use client";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

// Define the Pepu Testnet using defineChain for proper typing
const pepuTestnet = defineChain({
  id: 97740,
  name: "Pepu Testnet",
  nativeCurrency: { 
    name: "PEPE", 
    symbol: "PEPU", 
    decimals: 18 
  },
  rpcUrls: {
    default: { 
      http: ["/api/rpc"] 
    },
  },
  blockExplorers: {
    default: { 
      name: "Pepu Explorer", 
      url: "https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz" 
    },
  },
  testnet: true,
});

// Config with only testnet for now
export const config = createConfig({
  chains: [pepuTestnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: "efce48a19d0c7b8b8da21be2c1c8c271",
      metadata: {
        name: 'MatrixFrog',
        description: 'MatrixFrog Voting Platform',
        url: 'https://matrixfrog.com',
        icons: ['https://matrixfrog.com/favicon.ico']
      },
    }),
  ],
  transports: {
    [pepuTestnet.id]: http("/api/rpc", {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  batch: {
    multicall: true,
  },
  pollingInterval: 4_000,
});

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 3,
        staleTime: 30_000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
