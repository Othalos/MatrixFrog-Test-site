"use client";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

// 1. Define the Pepe Unchained Mainnet
const pepeUnchained = {
  id: 97741,
  name: "Pepe Unchained",
  iconUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png",
  iconBackground: "#fff",
  nativeCurrency: { name: "PEPE", symbol: "PEPU", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc-pepu-v2-mainnet-0.t.conduit.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "PepuScan",
      url: "https://explorer-pepe-unchained-gupg0lo9wf.t.conduit.xyz", 
    },
  },
};

// 2. Define the Pepe Unchained Testnet
const pepuTestnet = {
  id: 97740, // Your specified chain ID
  name: "Pepu Testnet",
  iconUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/5805.png",
  iconBackground: "#fff",
  nativeCurrency: { name: "PEPE", symbol: "PEPU", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "PepuScan Testnet",
      url: "https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz",
    },
  },
  testnet: true, // Mark this as a testnet
};


// MFG Token contract address (remains the same if it's on mainnet)
export const MFG_TOKEN_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";

// 3. Update the config to include BOTH chains
export const config = createConfig({
  chains: [pepeUnchained, pepuTestnet], // Add both chains to the array
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
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-z-index': '9999',
        }
      }
    }),
  ],
  transports: {
    // Define a transport for each chain
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
