import { useState, useCallback, useEffect } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useSwitchChain,
  useReadContract 
} from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Chain Konfiguration
export const PEPE_UNCHAINED_CHAIN_ID = 97741;

// MFG Token Konfiguration  
const MFG_TOKEN_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

interface WalletConnectHook {
  // Wallet Status
  isConnected: boolean;
  address: string | undefined;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  
  // MFG Token Balance
  mfgBalance: string;
  rawMfgBalance: bigint | undefined;
  balanceLoading: boolean;
  
  // Connection Methods
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  connectCoinbase: () => Promise<void>;
  disconnect: () => void;
  
  // Network Management
  switchToPepeUnchained: () => Promise<void>;
  
  // Utility
  formatTokenBalance: (balance: bigint, decimals?: number) => string;
  refetchBalance: () => void;
}

export const useWalletConnect = (): WalletConnectHook => {
  const { isConnected, address, chain } = useAccount();
  const { connect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  
  const [isConnecting, setIsConnecting] = useState(false);
  
  const isCorrectNetwork = chain?.id === PEPE_UNCHAINED_CHAIN_ID;
  
  // MFG Token Balance
  const {
    data: balance,
    isLoading: balanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && isCorrectNetwork,
    },
  });

  // Format token balance helper
  const formatTokenBalance = useCallback((balance: bigint, decimals = 18): string => {
    if (!balance) return "0";
    
    const divisor = BigInt(10 ** decimals);
    const quotient = balance / divisor;
    const remainder = balance % divisor;
    
    if (remainder === 0n) {
      return quotient.toLocaleString("en-US");
    }
    
    // Convert to number for proper formatting
    const fullNumber = Number(balance) / Math.pow(10, decimals);
    
    // Format with max 2 decimal places and proper thousands separators
    return fullNumber.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, []);

  const formattedBalance = balance ? formatTokenBalance(balance as bigint) : "0";

  // Network Management
  const addPepeUnchainedNetwork = async (): Promise<boolean> => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${PEPE_UNCHAINED_CHAIN_ID.toString(16)}`,
              chainName: "Pepe Unchained Mainnet",
              rpcUrls: ["https://rpc-pepu-v2-mainnet-0.t.conduit.xyz"],
              nativeCurrency: { 
                name: "PEPE", 
                symbol: "PEPU", 
                decimals: 18 
              },
              blockExplorerUrls: ["https://explorer-pepu-v2-mainnet-0.t.conduit.xyz"],
            },
          ],
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add network:", error);
      return false;
    }
  };

  const switchToPepeUnchained = useCallback(async () => {
    try {
      if (switchChain) {
        // First try to switch using wagmi
        await switchChain({ chainId: PEPE_UNCHAINED_CHAIN_ID });
      } else {
        // Fallback: try switch first, then add if it fails with 4902
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${PEPE_UNCHAINED_CHAIN_ID.toString(16)}` }]
          });
        } catch (switchError: any) {
          // Error code 4902 means the chain is not added to the wallet
          if (switchError.code === 4902) {
            await addPepeUnchainedNetwork();
          } else {
            throw switchError;
          }
        }
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
      // Final fallback
      await addPepeUnchainedNetwork();
    }
  }, [switchChain]);

  // Connection Methods
  const connectMetaMask = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect({ connector: injected() });
      setTimeout(async () => {
        await switchToPepeUnchained();
        setIsConnecting(false);
      }, 1000);
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      setIsConnecting(false);
    }
  }, [connect, switchToPepeUnchained]);

  const connectWalletConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      await connect({
        connector: walletConnect({
          projectId: "efce48a19d0c7b8b8da21be2c1c8c271",
          metadata: {
            name: 'MatrixFrog',
            description: 'MatrixFrog Platform',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
            icons: ['https://via.placeholder.com/128x128.png?text=MF']
          }
        }),
      });
      
      setTimeout(async () => {
        await switchToPepeUnchained();
        setIsConnecting(false);
      }, isMobileDevice ? 2000 : 1000);
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      setIsConnecting(false);
    }
  }, [connect, switchToPepeUnchained]);

  const connectCoinbase = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect({ 
        connector: coinbaseWallet({
          appName: 'MatrixFrog'
        })
      });
      
      setTimeout(async () => {
        await switchToPepeUnchained();
        setIsConnecting(false);
      }, 1000);
    } catch (error) {
      console.error("Coinbase connection failed:", error);
      setIsConnecting(false);
    }
  }, [connect, switchToPepeUnchained]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setIsConnecting(false);
  }, [wagmiDisconnect]);

  // Auto-save balance to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && formattedBalance && isConnected) {
      window.localStorage.setItem("Mat_bal", formattedBalance);
    }
  }, [formattedBalance, isConnected]);

  return {
    // Wallet Status
    isConnected,
    address,
    isCorrectNetwork,
    isConnecting,
    
    // MFG Token Balance
    mfgBalance: formattedBalance,
    rawMfgBalance: balance as bigint | undefined,
    balanceLoading,
    
    // Connection Methods
    connectMetaMask,
    connectWalletConnect,
    connectCoinbase,
    disconnect,
    
    // Network Management
    switchToPepeUnchained,
    
    // Utility
    formatTokenBalance,
    refetchBalance,
  };
};