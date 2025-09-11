"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, maxUint256 } from "viem";
import { AlertTriangle, Wallet } from "lucide-react";
import { Button } from "@/app/components/ui/button";

// **FIX**: Corrected relative path to the abis folder
import ERC20_ABI from "../../abis/ERC20.json";
import STAKING_ABI from "../../abis/Staking.json";

// --- Chain & Contract Configuration ---
const PEPU_TESTNET_ID = 97740;
const STAKING_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827" as `0x${string}`;
const MFG_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889" as `0x${string}`;
const POOL_ID = 0n;

// Define chain for viem
const pepuTestnet = {
  id: PEPU_TESTNET_ID,
  name: 'Pepu Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'PEPU',
    symbol: 'PEPU',
  },
  rpcUrls: {
    default: {
      http: ['/api/rpc'],
    },
  },
} as const;

// --- Helper Functions ---
const formatDisplayNumber = (value: string | number, decimals = 4) => {
  const num = Number(value);
  if (isNaN(num)) return "0.0000";
  if (num === 0) return "0.0000";
  return num.toLocaleString("en-US", { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

// --- Main Component ---
export default function StakingSection() {
  const [account, setAccount] = useState<`0x${string}` | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState<number | undefined>();
  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Contract data states
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [userStakedAmount, setUserStakedAmount] = useState<bigint>(0n);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);

  const isCorrectNetwork = chainId === PEPU_TESTNET_ID;

  // Create clients
  const publicClient = createPublicClient({
    chain: pepuTestnet,
    transport: http('/api/rpc'),
  });

  const getWalletClient = useCallback(async () => {
    if (!window.ethereum) return null;
    return createWalletClient({
      chain: pepuTestnet,
      transport: custom(window.ethereum),
    });
  }, []);

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setNotification({ message: "MetaMask not found!", type: "error" });
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      setAccount(accounts[0]);
      setIsConnected(true);
      setChainId(parseInt(chainId, 16));
    } catch (error) {
      console.error('Failed to connect:', error);
      setNotification({ message: "Failed to connect wallet", type: "error" });
    }
  }, []);

  // Switch to correct network
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${PEPU_TESTNET_ID.toString(16)}` }],
      });
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 4902) {
        // Chain not added, try to add it
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${PEPU_TESTNET_ID.toString(16)}`,
              chainName: 'Pepu Testnet',
              nativeCurrency: {
                name: 'PEPU',
                symbol: 'PEPU',
                decimals: 18,
              },
              rpcUrls: ['https://pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'],
              blockExplorerUrls: ['https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  }, []);

  // Read contract data
  const readContractData = useCallback(async () => {
    if (!account || !isCorrectNetwork) return;

    try {
      const [balanceResult, allowanceResult, stakeResult, rewardsResult] = await Promise.all([
        publicClient.readContract({
          address: MFG_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'balanceOf',
          args: [account],
        }),
        publicClient.readContract({
          address: MFG_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'allowance',
          args: [account, STAKING_ADDRESS],
        }),
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'stakes',
          args: [POOL_ID, account],
        }),
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'pendingRewards',
          args: [POOL_ID, account],
        }),
      ]);

      setBalance(balanceResult as bigint);
      setAllowance(allowanceResult as bigint);
      setUserStakedAmount((stakeResult as [bigint])[0]);
      setPendingRewards(rewardsResult as bigint);
    } catch (error) {
      console.error('Failed to read contract data:', error);
    }
  }, [account, isCorrectNetwork, publicClient]);

  // Submit transaction
  const submitTransaction = useCallback(async (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) => {
    if (!account) return;

    setIsLoading(true);
    setNotification(null);

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) throw new Error('No wallet client');

      const hash = await walletClient.writeContract({
        ...args,
        account,
      });

      setNotification({ 
        message: "Transaction submitted! Waiting for confirmation...", 
        type: "success" 
      });

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      if (receipt.status === 'success') {
        setNotification({ 
          message: "Transaction confirmed! Refreshing data...", 
          type: "success" 
        });
        
        // Refresh data after successful transaction
        setTimeout(() => {
          readContractData();
          setNotification(null);
        }, 2000);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error: unknown) {
      console.error('Transaction error:', error);
      const err = error as { message?: string };
      setNotification({ 
        message: `Error: ${err.message || 'Transaction failed'}`, 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [account, getWalletClient, publicClient, readContractData]);

  // Transaction handlers
  const handleApprove = useCallback(() => {
    submitTransaction({
      address: MFG_ADDRESS,
      abi: ERC20_ABI as readonly unknown[],
      functionName: 'approve',
      args: [STAKING_ADDRESS, maxUint256],
    });
  }, [submitTransaction]);

  const handleStake = useCallback(() => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setNotification({ message: "Please enter a valid stake amount", type: "error" });
      return;
    }

    const stakeAmountBN = parseUnits(stakeAmount, 18);
    
    if (stakeAmountBN > balance) {
      setNotification({ message: "Insufficient MFG balance", type: "error" });
      return;
    }

    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'stake',
      args: [POOL_ID, stakeAmountBN],
    });
  }, [submitTransaction, stakeAmount, balance]);

  const handleUnstake = useCallback(() => {
    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'unstake',
      args: [POOL_ID],
    });
  }, [submitTransaction]);

  const handleClaim = useCallback(() => {
    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'claimRewards',
      args: [POOL_ID],
    });
  }, [submitTransaction]);

  const handleMaxClick = useCallback(() => {
    if (balance > 0n) {
      setStakeAmount(formatUnits(balance, 18));
    }
  }, [balance]);

  // Effects
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0] as `0x${string}` || undefined);
        setIsConnected(accounts.length > 0);
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        setChainId(parseInt(chainId, 16));
      });
    }
  }, []);

  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      readContractData();
      const interval = setInterval(readContractData, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isCorrectNetwork, readContractData]);

  // Derived values
  const stakeAmountBN = stakeAmount ? parseUnits(stakeAmount, 18) : 0n;
  const needsApproval = stakeAmountBN > 0n && allowance < stakeAmountBN;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-black border border-green-700/50 text-green-300 font-mono">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl text-green-400">
            Stake MFG for PTX at 25% APR
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {!isConnected ? (
            <div className="p-6 rounded-md bg-black border border-green-700 flex flex-col items-center space-y-4">
              <h3 className="text-lg font-bold text-green-400">Connect Wallet to Continue</h3>
              <Button 
                onClick={connectWallet}
                className="w-full px-4 py-3 font-bold rounded-md border border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60"
              >
                Connect MetaMask
              </Button>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="p-6 rounded-md bg-yellow-900/80 text-yellow-300 border border-yellow-700 flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={24} />
                <span className="font-bold text-lg">Wrong Network</span>
              </div>
              <p className="text-center">Please switch to Pepu Testnet</p>
              <Button 
                onClick={switchNetwork}
                className="px-6 py-2 bg-yellow-600 text-black font-bold rounded-md hover:bg-yellow-500"
              >
                Switch to Pepu Testnet
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Wallet Balance */}
              <div className="p-4 border border-green-700/50 rounded-md bg-green-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wallet size={20} className="text-green-400" />
                    <span className="text-green-400 font-bold">Your MFG Balance:</span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {formatDisplayNumber(formatUnits(balance, 18))} MFG
                  </span>
                </div>
              </div>

              {/* Staking Input Section */}
              <div className="border border-green-700/50 rounded-md p-4 space-y-4 bg-green-900/5">
                <h3 className="text-lg font-bold text-green-400 text-center">Stake MFG Tokens</h3>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="number" 
                    value={stakeAmount} 
                    onChange={(e) => setStakeAmount(e.target.value)} 
                    placeholder="Enter amount to stake" 
                    className="flex-1 bg-black border border-green-700/50 p-3 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" 
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleMaxClick} 
                    disabled={isLoading || balance === 0n}
                    className="px-4 py-3 bg-green-900/50 border border-green-700 text-green-400 rounded-md hover:bg-green-800/50 font-bold"
                  >
                    MAX
                  </Button>
                </div>
                
                {needsApproval ? (
                  <Button 
                    onClick={handleApprove} 
                    disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0} 
                    className="w-full px-4 py-3 font-bold rounded-md border border-yellow-500 bg-yellow-900/50 text-yellow-300 hover:enabled:bg-yellow-800/60 disabled:opacity-50"
                  >
                    {isLoading ? "Processing..." : "Approve MFG"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStake} 
                    disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0} 
                    className="w-full px-4 py-3 font-bold rounded-md border border-green-500 bg-green-900/50 text-green-300 hover:enabled:bg-green-800/60 disabled:opacity-50"
                  >
                    {isLoading ? "Processing..." : "Stake MFG"}
                  </Button>
                )}
              </div>

              {/* Staked & Rewards Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-green-700/50 rounded-md p-4 bg-blue-900/10">
                  <h3 className="text-lg font-bold text-blue-400 text-center mb-4">Staked MFG</h3>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-white">
                      {formatDisplayNumber(formatUnits(userStakedAmount, 18))}
                    </div>
                    <div className="text-sm text-gray-400">MFG Tokens</div>
                  </div>
                  <Button 
                    onClick={handleUnstake} 
                    disabled={isLoading || userStakedAmount === 0n} 
                    className="w-full px-4 py-3 font-bold rounded-md border border-red-500 bg-red-900/50 text-red-300 hover:enabled:bg-red-800/60 disabled:opacity-50"
                  >
                    {isLoading ? "Processing..." : "Unstake All"}
                  </Button>
                </div>

                <div className="border border-green-700/50 rounded-md p-4 bg-purple-900/10">
                  <h3 className="text-lg font-bold text-purple-400 text-center mb-4">PTX Rewards</h3>
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-white">
                      {formatDisplayNumber(formatUnits(pendingRewards, 18))}
                    </div>
                    <div className="text-sm text-gray-400">PTX Earned</div>
                  </div>
                  <Button 
                    onClick={handleClaim} 
                    disabled={isLoading || pendingRewards === 0n} 
                    className="w-full px-4 py-3 font-bold rounded-md border border-purple-500 bg-purple-900/50 text-purple-300 hover:enabled:bg-purple-800/60 disabled:opacity-50"
                  >
                    {isLoading ? "Processing..." : "Claim PTX"}
                  </Button>
                </div>
              </div>

              {/* Notification */}
              {notification && (
                <div className={`p-4 rounded-md border-2 ${
                  notification.type === "error" 
                    ? "bg-red-900/50 border-red-500 text-red-300" 
                    : "bg-green-900/50 border-green-500 text-green-300"
                }`}>
                  <p className="text-center font-bold">{notification.message}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
