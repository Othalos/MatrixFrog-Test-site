import { useState, useCallback, useEffect } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useSwitchChain,
  useReadContract 
} from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { PEPE_UNCHAINED_CHAIN_ID, getNetworkParams } from '../lib/chains';

// Token Addresses
const MFG_TOKEN_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";
const PTX_TOKEN_ADDRESS = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2";

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
  isConnected: boolean;
  address: string | undefined;
  chain: { id: number; name?: string } | undefined;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  // MFG Token
  mfgBalance: string;
  rawMfgBalance: bigint | undefined;
  // PTX Token
  ptxBalance: string;
  rawPtxBalance: bigint | undefined;
  // Other
  balanceLoading: boolean;
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  connectCoinbase: () => Promise<void>;
  disconnect: () => void;
  switchToPepeUnchained: () => Promise<void>;
  switchToEthereum: () => Promise<void>;
  handleNetworkSwitch: () => void;
  formatTokenBalance: (balance: bigint, decimals?: number) => string;
  refetchBalance: () => void;
  refetchMfgBalance: () => void;
  refetchPtxBalance: () => void;
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
    data: mfgBalanceData,
    isLoading: mfgBalanceLoading,
    refetch: refetchMfgBalance,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && isCorrectNetwork,
    },
  });

  // PTX Token Balance
  const {
    data: ptxBalanceData,
    isLoading: ptxBalanceLoading,
    refetch: refetchPtxBalance,
  } = useReadContract({
    address: PTX_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && isCorrectNetwork,
    },
  });

  const balanceLoading = mfgBalanceLoading || ptxBalanceLoading;

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
    
    const fullNumber = Number(balance) / Math.pow(10, decimals);
    return fullNumber.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }, []);

  const formattedMfgBalance = mfgBalanceData ? formatTokenBalance(mfgBalanceData as bigint) : "0";
  const formattedPtxBalance = ptxBalanceData ? formatTokenBalance(ptxBalanceData as bigint) : "0";

  // Refetch both balances
  const refetchBalance = useCallback(() => {
    refetchMfgBalance();
    refetchPtxBalance();
  }, [refetchMfgBalance, refetchPtxBalance]);

  // Network-Addition mit Coinbase-spezifischen Anpassungen
  const addNetwork = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === "undefined" || !window.ethereum) return false;
      
      const networkParams = getNetworkParams();
      
      // Erst versuchen zu switchen, dann hinzufügen
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: networkParams.chainId }],
        });
        return true;
      } catch (switchError) {
        const error = switchError as { code?: number };
        // Network existiert nicht - hinzufügen
        if (error.code === 4902 || error.code === -32603) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [networkParams],
          });
          
          // Coinbase braucht längere Pause nach Network-Addition
          if (isCoinbaseWallet()) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          // Nach Hinzufügen nochmal switchen
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: networkParams.chainId }],
          });
          return true;
        }
        throw switchError;
      }
    } catch (error) {
      const err = error as { code?: number };
      
      // Bei User-Reject trotzdem prüfen ob Chain gewechselt wurde (typisch für Coinbase)
      if (err.code === 4001 && isCoinbaseWallet()) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
          if (currentChainId === getNetworkParams().chainId) {
            console.log("Network switched despite user rejection");
            return true;
          }
        } catch {
          console.log("Could not verify chain state");
        }
      }
      
      // Nur loggen wenn es ein echter Fehler ist (nicht leeres Objekt)
      if (err.code && err.code !== 4001) {
        console.error("Network operation failed:", error);
      } else if (!err.code && Object.keys(error as object).length > 0) {
        // Prüfen ob das Error-Objekt wirklich Inhalte hat
        const hasRealContent = Object.values(error as object).some(val => val !== undefined && val !== null && val !== '');
        if (hasRealContent) {
          console.error("Network operation failed:", error);
        } else {
          console.log("Network operation completed with empty response");
        }
      }
      return false;
    }
  }, [isCoinbaseWallet]);

  // Vereinfachte Network-Switch-Funktion
  const switchToPepeUnchained = useCallback(async () => {
    try {
      // Wagmi-basierter Switch für normale Wallets
      if (switchChain && !isCoinbaseWallet()) {
        await switchChain({ chainId: PEPE_UNCHAINED_CHAIN_ID });
        return;
      }
      
      // Fallback für alle Wallets (inkl. Coinbase)
      await addNetwork();
    } catch (error) {
      console.log("Switch failed, trying fallback:", error);
      await addNetwork();
    }
  }, [switchChain, isCoinbaseWallet, addNetwork]);

  // Switch to Ethereum network
  const switchToEthereum = useCallback(async () => {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        console.error("No ethereum provider found");
        return;
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }], // Ethereum mainnet
      });
    } catch (error) {
      console.error("Failed to switch to Ethereum:", error);
      throw error;
    }
  }, []);

  const handleNetworkSwitch = useCallback(() => {
    switchToPepeUnchained();
  }, [switchToPepeUnchained]);

  // Enhanced MetaMask Connection mit Provider-Selection
  const connectMetaMask = useCallback(async () => {
    setIsConnecting(true);
    try {
      let provider = window.ethereum;
      
      // Provider-Selection für Multi-Wallet-Umgebungen
      if (window.ethereum?.providers?.length > 0) {
        provider = window.ethereum.providers.find((p: unknown) => {
          const typedProvider = p as { isMetaMask?: boolean; isCoinbaseWallet?: boolean };
          return typedProvider.isMetaMask && !typedProvider.isCoinbaseWallet;
        });
        if (!provider) {
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
    } catch (error) {
      console.error("MetaMask connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const connectWalletConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
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
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  const connectCoinbase = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect({ 
        connector: coinbaseWallet({
          appName: 'MatrixFrog'
        })
      });
    } catch (error) {
      console.error("Coinbase connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);

  // Enhanced Disconnect mit Coinbase-spezifischer Bereinigung
  const disconnect = useCallback(async () => {
    // Coinbase Wallet localStorage cleanup (verhindert Reconnection-Probleme)
    if (isCoinbaseWallet()) {
      try {
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

        // Bereinige alle coinbase/walletlink keys
        Object.keys(localStorage).forEach(key => {
          if (key.includes('coinbase') || key.includes('walletlink')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.log("Storage cleanup attempted:", storageError);
      }
    }
    
    wagmiDisconnect();
    setIsConnecting(false);
  }, [wagmiDisconnect, isCoinbaseWallet]);

  // Auto-save balances
  useEffect(() => {
    if (typeof window !== 'undefined' && isConnected) {
      if (formattedMfgBalance) {
        window.localStorage.setItem("MFG_bal", formattedMfgBalance);
      }
      if (formattedPtxBalance) {
        window.localStorage.setItem("PTX_bal", formattedPtxBalance);
      }
    }
  }, [formattedMfgBalance, formattedPtxBalance, isConnected]);

  return {
    isConnected,
    address,
    chain,
    isCorrectNetwork,
    isConnecting,
    // MFG Token
    mfgBalance: formattedMfgBalance,
    rawMfgBalance: mfgBalanceData as bigint | undefined,
    // PTX Token
    ptxBalance: formattedPtxBalance,
    rawPtxBalance: ptxBalanceData as bigint | undefined,
    // Other
    balanceLoading,
    connectMetaMask,
    connectWalletConnect,
    connectCoinbase,
    disconnect,
    switchToPepeUnchained,
    switchToEthereum,
    handleNetworkSwitch,
    formatTokenBalance,
    refetchBalance,
    refetchMfgBalance,
    refetchPtxBalance,
  };
};
