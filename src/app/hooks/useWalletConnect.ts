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
  const { isConnected, address, chain, connector } = useAccount();
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

  // Check if current connector is Coinbase Wallet
  const isCoinbaseWallet = useCallback(() => {
    return connector?.id === 'coinbaseWalletSDK' || 
           (typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet);
  }, [connector]);

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

  // Enhanced network addition specifically for Coinbase Wallet
  const addPepeUnchainedNetworkCoinbase = async (): Promise<boolean> => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // For Coinbase Wallet, we need to be more explicit about the network parameters
        const networkParams = {
          chainId: `0x${PEPE_UNCHAINED_CHAIN_ID.toString(16)}`,
          chainName: "Pepe Unchained Mainnet",
          rpcUrls: ["https://rpc-pepu-v2-mainnet-0.t.conduit.xyz"],
          nativeCurrency: { 
            name: "PEPU", 
            symbol: "PEPU", 
            decimals: 18 
          },
          blockExplorerUrls: ["https://explorer-pepu-v2-mainnet-0.t.conduit.xyz"],
        };

        console.log("Adding network with params:", networkParams);

        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [networkParams],
        });

        // Wait a bit longer for Coinbase Wallet to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to switch to the network after adding it
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: networkParams.chainId }],
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add/switch network for Coinbase:", error);
      return false;
    }
  };

  // Standard network addition for other wallets
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
      // For Coinbase Wallet, use special handling
      if (isCoinbaseWallet()) {
        console.log("Detected Coinbase Wallet, using enhanced network handling");
        const success = await addPepeUnchainedNetworkCoinbase();
        if (!success) {
          throw new Error("Failed to add network via Coinbase Wallet method");
        }
        return;
      }

      // For other wallets, try wagmi switchChain first
      if (switchChain) {
        await switchChain({ chainId: PEPE_UNCHAINED_CHAIN_ID });
      } else {
        await addPepeUnchainedNetwork();
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
      
      // Fallback: try manual network addition
      if (isCoinbaseWallet()) {
        await addPepeUnchainedNetworkCoinbase();
      } else {
        await addPepeUnchainedNetwork();
      }
    }
  }, [switchChain, isCoinbaseWallet]);

  // Enhanced MetaMask connection with provider selection
  const connectMetaMask = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Force MetaMask provider selection
      let provider = window.ethereum;
      
      // If multiple providers exist, select MetaMask specifically
      if (window.ethereum?.providers?.length > 0) {
        // Find MetaMask provider specifically
        provider = window.ethereum.providers.find((p: unknown) => {
          const typedProvider = p as { isMetaMask?: boolean; isCoinbaseWallet?: boolean };
          return typedProvider.isMetaMask && !typedProvider.isCoinbaseWallet;
        });
        if (!provider) {
          // Fallback to first MetaMask-like provider
          provider = window.ethereum.providers.find((p: unknown) => {
            const typedProvider = p as { isMetaMask?: boolean };
            return typedProvider.isMetaMask;
          });
        }
      } else if (window.ethereum?.isMetaMask && !window.ethereum?.isCoinbaseWallet) {
        provider = window.ethereum;
      }

      if (!provider) {
        throw new Error("MetaMask not found");
      }

      const typedProvider = provider as { isMetaMask?: boolean };
      console.log("Using provider:", typedProvider?.isMetaMask ? "MetaMask" : "Unknown", provider);

      // Create injected connector with specific provider
      const connector = injected({
        target() {
          return {
            id: 'metaMask',
            name: 'MetaMask',
            provider: provider
          };
        }
      });

      await connect({ connector });
      
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
      
      // Longer delay for Coinbase Wallet to establish connection
      setTimeout(async () => {
        try {
          await switchToPepeUnchained();
        } catch (networkError) {
          console.error("Network switch failed after Coinbase connection:", networkError);
          // Show user-friendly message that manual network addition might be needed
        } finally {
          setIsConnecting(false);
        }
      }, 3000); // Increased delay for Coinbase
    } catch (error) {
      console.error("Coinbase connection failed:", error);
      setIsConnecting(false);
    }
  }, [connect, switchToPepeUnchained]);

  const disconnect = useCallback(async () => {
    // Enhanced disconnect for Coinbase Wallet
    if (isCoinbaseWallet()) {
      try {
        console.log("Attempting Coinbase Wallet deep disconnect...");
        
        // Method 1: Clear permissions
        if (typeof window !== 'undefined' && window.ethereum?.isCoinbaseWallet) {
          try {
            await window.ethereum.request({
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }]
            });
          } catch (revokeError) {
            console.log("Permission revoke attempted:", revokeError);
          }

          // Method 2: Request new permissions (this clears old ones)
          try {
            await window.ethereum.request({
              method: 'wallet_requestPermissions',
              params: [{ eth_accounts: {} }]
            });
          } catch (requestError) {
            console.log("Permission request attempted:", requestError);
          }
        }

        // Method 3: Clear local storage entries that Coinbase might use
        try {
          if (typeof window !== 'undefined') {
            const keysToRemove = [
              'coinbase-wallet-session',
              'coinbase-wallet-addresses',
              'coinbase-wallet-permission',
              '-walletlink:https://www.walletlink.org:version',
              '-walletlink:https://www.walletlink.org:session:id',
              '-walletlink:https://www.walletlink.org:session:secret',
              '-walletlink:https://www.walletlink.org:session:linked'
            ];
            
            keysToRemove.forEach(key => {
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
            });

            // Clear any other coinbase-related keys
            Object.keys(localStorage).forEach(key => {
              if (key.includes('coinbase') || key.includes('walletlink')) {
                localStorage.removeItem(key);
              }
            });
          }
        } catch (storageError) {
          console.log("Storage cleanup attempted:", storageError);
        }

        // Method 4: Reset the provider if possible
        try {
          const ethereum = window.ethereum as { close?: () => void; isCoinbaseWallet?: boolean };
          if (ethereum?.isCoinbaseWallet && ethereum.close) {
            ethereum.close();
          }
        } catch (closeError) {
          console.log("Provider close attempted:", closeError);
        }

      } catch (disconnectError) {
        console.log("Enhanced Coinbase disconnect attempted:", disconnectError);
      }
    }
    
    // Always call wagmi disconnect
    wagmiDisconnect();
    setIsConnecting(false);

    // Force a small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [wagmiDisconnect, isCoinbaseWallet]);

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