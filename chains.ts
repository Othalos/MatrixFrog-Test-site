// chains.ts
export const PEPE_UNCHAINED_CHAIN_ID = 97741;

export const pepuMainnet = {
  id: PEPE_UNCHAINED_CHAIN_ID,
  name: 'Pepu Mainnet',
  nativeCurrency: { 
    name: 'Pepu',
    symbol: 'PEPU', 
    decimals: 18 
  },
  rpcUrls: { 
    default: { 
      http: ['/api/rpc'], // Nur eine statische URL
    },
    public: { 
      http: ['https://rpc-pepu-v2-mainnet-0.t.conduit.xyz'] 
    }
  },
  blockExplorers: { 
    default: { 
      name: 'Pepu Explorer', 
      url: 'https://explorer-pepu-v2-mainnet-0.t.conduit.xyz'
    } 
  },
  testnet: false,
} as const;

export const getNetworkParams = () => ({
  chainId: `0x${PEPE_UNCHAINED_CHAIN_ID.toString(16)}`,
  chainName: "Pepe Unchained Mainnet",
  rpcUrls: ["https://rpc-pepu-v2-mainnet-0.t.conduit.xyz"],
  nativeCurrency: { 
    name: "PEPU", 
    symbol: "PEPU", 
    decimals: 18 
  },
  blockExplorerUrls: ["https://explorer-pepu-v2-mainnet-0.t.conduit.xyz"],
  iconUrls: ["https://via.placeholder.com/128x128.png?text=PEPU"],
});

export const isCorrectChain = (chainId: number | undefined): boolean => {
  return chainId === PEPE_UNCHAINED_CHAIN_ID;
};