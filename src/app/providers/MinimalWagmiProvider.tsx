"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

// Simple testnet-only config
const testnetConfig = createConfig({
  chains: [{
    id: 97740,
    name: "Pepu Testnet",
    nativeCurrency: { name: "PEPU", symbol: "PEPU", decimals: 18 },
    rpcUrls: { default: { http: ["/api/rpc"] } },
  }],
  connectors: [injected()],
  transports: {
    97740: http("/api/rpc"),
  },
});

export default function MinimalWagmiProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={testnetConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
