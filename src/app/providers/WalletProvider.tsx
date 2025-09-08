"use client";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

// Define the Pepe Unchained Mainnet
const pepeUnchained = {
  id: 97741,
  name: "Pepe Unchained",
  nativeCurrency: { name: "PEPE", symbol: "PEPU", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-pepu-v2-mainnet-0.t.conduit.xyz"] },
  },
  blockExplorers: {
    default: { name: "PepuScan", url: "https://explorer-pepe-unchained-gupg0lo9wf.t.conduit.xyz" },
  },
};

// Define the Pepe Unchained Testnet
const pepuTestnet = {
  id: 97740,
  name: "Pepu Testnet",
  nativeCurrency: { name: "PEPE", symbol: "PEPU", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz"] },
  },
  blockExplorers: {
    default: { name: "PepuScan Testnet", url: "https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz" },
  },
  testnet: true,
};

// Update the config to include BOTH chains
export const config = createConfig({
  chains: [pepeUnchained, pepuTestnet],
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
    [pepeUnchained.id]: http(),
    [pepuTestnet.id]: http(),
  },
});

export default function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
