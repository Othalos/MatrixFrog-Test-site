"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { parseUnits, formatUnits, maxUint256, type Hash } from "viem";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

// **FIX**: Corrected relative path to the abis folder
import ERC20_ABI from "../../abis/ERC20.json";
import STAKING_ABI from "../../abis/Staking.json";

// --- Chain & Contract Configuration ---
const PEPU_TESTNET_ID = 97740;
const STAKING_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827" as `0x${string}`;
const MFG_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889" as `0x${string}`;
const POOL_ID = 0n;

// --- Helper Functions ---
const formatDisplayNumber = (value: string | number) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
};

// --- Main Component ---
export default function StakingSection() {
  const { address, isConnected, chain } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();

  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  
  const isCorrectNetwork = chain?.id === PEPU_TESTNET_ID;
  const sharedReadConfig = { 
    query: { 
      enabled: isConnected && isCorrectNetwork && !!address,
      refetchInterval: 10000 // Refetch every 10 seconds
    } 
  };

  // --- Read Contract Data ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MFG_ADDRESS, 
    abi: ERC20_ABI, 
    functionName: "allowance",
    args: address ? [address, STAKING_ADDRESS] : undefined, 
    ...sharedReadConfig,
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: MFG_ADDRESS, 
    abi: ERC20_ABI, 
    functionName: "balanceOf",
    args: address ? [address] : undefined, 
    ...sharedReadConfig,
  });

  const { data: userStakeData, refetch: refetchUserStake } = useReadContract({
    address: STAKING_ADDRESS, 
    abi: STAKING_ABI, 
    functionName: "stakes",
    args: address ? [POOL_ID, address] : undefined, 
    ...sharedReadConfig,
  });

  const { data: pendingRewardsData, refetch: refetchPendingRewards } = useReadContract({
    address: STAKING_ADDRESS, 
    abi: STAKING_ABI, 
    functionName: "pendingRewards",
    args: address ? [POOL_ID, address] : undefined, 
    ...sharedReadConfig,
  });

  const { writeContract, isPending, error: writeError } = useWriteContract();
  const { isSuccess: txConfirmed, isLoading: isConfirming, error: txError } = useWaitForTransactionReceipt({ 
    hash: txHash,
    confirmations: 2 // Wait for 2 confirmations
  });

  // --- Refetch data when a transaction is confirmed ---
  const refetchAllData = useCallback(() => {
    refetchAllowance();
    refetchBalance();
    refetchUserStake();
    refetchPendingRewards();
  }, [refetchAllowance, refetchBalance, refetchUserStake, refetchPendingRewards]);

  useEffect(() => {
    if (txConfirmed) {
      setNotification({ message: "Transaction Confirmed! Refreshing data...", type: "success" });
      setTimeout(() => {
        refetchAllData();
        setNotification(null);
        setTxHash(undefined); // Clear the hash
      }, 2000);
    }
  }, [txConfirmed, refetchAllData]);

  // Handle write contract errors
  useEffect(() => {
    if (writeError) {
      setNotification({ 
        message: `Transaction failed: ${writeError.message}`, 
        type: "error" 
      });
    }
  }, [writeError]);

  // Handle transaction errors
  useEffect(() => {
    if (txError) {
      setNotification({ 
        message: `Transaction error: ${txError.message}`, 
        type: "error" 
      });
    }
  }, [txError]);

  // --- Derived Values ---
  const allowance: bigint = (allowanceData as bigint) ?? 0n;
  const balance: bigint = (balanceData as bigint) ?? 0n;
  const stakeAmountBN: bigint = stakeAmount ? parseUnits(stakeAmount, 18) : 0n;
  const needsApproval = stakeAmountBN > allowance && stakeAmountBN > 0n;
  const userStakedAmount = (userStakeData as [bigint])?.[0] ?? 0n;
  const hasStaked = userStakedAmount > 0n;
  const isLoading = isPending || isConfirming;
  const pendingRewards = (pendingRewardsData as bigint) ?? 0n;

  // --- Actions ---
  const submitTransaction = useCallback((args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) => {
    setNotification(null); // Clear any existing notifications
    writeContract(args, {
      onSuccess: (hash) => {
        setTxHash(hash);
        setNotification({ message: "Transaction submitted! Waiting for confirmation...", type: "success" });
      },
      onError: (err) => {
        console.error("Transaction error:", err);
        setNotification({ 
          message: `Transaction failed: ${err.message || 'Unknown error'}`, 
          type: "error" 
        });
      },
    });
  }, [writeContract]);

  const handleApprove = useCallback(() => {
    submitTransaction({ 
      address: MFG_ADDRESS, 
      abi: ERC20_ABI, 
      functionName: "approve", 
      args: [STAKING_ADDRESS, maxUint256] 
    });
  }, [submitTransaction]);

  const handleStake = useCallback(() => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setNotification({ message: "Please enter a valid stake amount.", type: "error" });
      return;
    }

    if (stakeAmountBN > balance) {
      setNotification({ message: "Insufficient balance.", type: "error" });
      return;
    }

    submitTransaction({ 
      address: STAKING_ADDRESS, 
      abi: STAKING_ABI, 
      functionName: "stake", 
      args: [POOL_ID, stakeAmountBN] 
    });
  }, [submitTransaction, stakeAmount, stakeAmountBN, balance]);

  const handleUnstake = useCallback(() => {
    submitTransaction({ 
      address: STAKING_ADDRESS, 
      abi: STAKING_ABI, 
      functionName: "unstake", 
      args: [POOL_ID] 
    });
  }, [submitTransaction]);

  const handleClaim = useCallback(() => {
    submitTransaction({ 
      address: STAKING_ADDRESS, 
      abi: STAKING_ABI, 
      functionName: "claimRewards", 
      args: [POOL_ID] 
    });
  }, [submitTransaction]);

  const handleMaxClick = useCallback(() => {
    if (balance > 0n) {
      setStakeAmount(formatUnits(balance, 18));
    }
  }, [balance]);

  return (
    <Card className="bg-black border border-green-700/50 text-green-300 font-mono">
      <CardHeader className="text-center">
        <CardTitle className="text-green-400 text-glow">STAKING TERMINAL :: MFG {'>'} PTX (Testnet)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {!isConnected ? (
          <div className="p-4 rounded-md bg-black border border-green-700 flex flex-col items-center space-y-4">
            <h3 className="text-lg font-bold text-green-400 text-glow">ACCESS DENIED :: CONNECT WALLET</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
              <Button 
                onClick={() => connect({ connector: injected() })} 
                className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse"
              >
                MetaMask
              </Button>
              <Button 
                onClick={() => connect({ 
                  connector: walletConnect({ 
                    projectId: "efce48a19d0c7b8b8da21be2c1c8c271",
                    showQrModal: true
                  }) 
                })} 
                className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse"
              >
                WalletConnect
              </Button>
              <Button 
                onClick={() => connect({ 
                  connector: coinbaseWallet({ 
                    appName: "MatrixFrog",
                    appLogoUrl: "https://matrixfrog.one/logo.png" // Add your logo URL
                  }) 
                })} 
                className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse"
              >
                Coinbase
              </Button>
            </div>
          </div>
        ) : !isCorrectNetwork ? (
          <div className="p-4 rounded-md bg-yellow-900/80 text-yellow-300 border border-yellow-700 flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} />
              <span className="font-bold">WRONG NETWORK</span>
            </div>
            <p className="text-sm text-center">Switch to the Pepu Testnet to use staking.</p>
            <button 
              onClick={() => switchChain({ chainId: PEPU_TESTNET_ID })} 
              className="px-4 py-2 bg-yellow-600 text-black font-bold rounded-md hover:bg-yellow-500"
            >
              Switch to Testnet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 border border-green-700/50 rounded-md">
                <div className="text-sm">Balance</div>
                <div className="text-xl font-bold text-white">
                  {formatDisplayNumber(formatUnits(balance, 18))}
                </div>
              </div>
              <div className="p-3 border border-green-700/50 rounded-md">
                <div className="text-sm">Staked</div>
                <div className="text-xl font-bold text-white">
                  {formatDisplayNumber(formatUnits(userStakedAmount, 18))}
                </div>
              </div>
              <div className="p-3 border border-green-700/50 rounded-md">
                <div className="text-sm">Rewards</div>
                <div className="text-xl font-bold text-white">
                  {formatDisplayNumber(formatUnits(pendingRewards, 18))}
                </div>
              </div>
              <div className="p-3 border border-green-700/50 rounded-md">
                <div className="text-sm">APR</div>
                <div className="text-xl font-bold text-white">25%</div>
              </div>
            </div>
            
            {!hasStaked ? (
              <div className="border border-green-700/50 rounded-md p-4 space-y-4">
                <div className="flex items-center">
                  <input 
                    type="number" 
                    value={stakeAmount} 
                    onChange={(e) => setStakeAmount(e.target.value)} 
                    placeholder="0.0" 
                    className="w-full bg-black border border-green-700/50 p-2 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 h-full" 
                    disabled={isLoading}
                  />
                  <button 
                    onClick={handleMaxClick} 
                    disabled={isLoading}
                    className="bg-green-900/50 border border-green-700 text-green-400 p-2 rounded-r-md hover:bg-green-800/50 h-full px-4 font-bold disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
                
                <button 
                  onClick={needsApproval ? handleApprove : handleStake} 
                  disabled={isLoading || parseFloat(stakeAmount || "0") <= 0} 
                  className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:enabled:bg-green-800/60 hover:enabled:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse"
                >
                  {isLoading ? (
                    isConfirming ? "Confirming..." : "Check Wallet..."
                  ) : (
                    needsApproval ? "Approve MFG" : "Stake MFG"
                  )}
                </button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <button 
                  onClick={handleUnstake} 
                  disabled={isLoading} 
                  className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-red-500 bg-red-900/50 text-red-300 hover:enabled:bg-red-800/60 hover:enabled:shadow-[0_0_15px_rgba(239,68,68,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse"
                >
                  {isLoading ? "Processing..." : "Unstake All"}
                </button>
                <button 
                  onClick={handleClaim} 
                  disabled={isLoading || pendingRewards === 0n} 
                  className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:enabled:bg-green-800/60 hover:enabled:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse"
                >
                  {isLoading ? "Processing..." : "Claim PTX"}
                </button>
              </div>
            )}
            
            {notification && (
              <div className={`mt-4 p-3 rounded-md border ${
                notification.type === "error" 
                  ? "bg-red-900/50 border-red-700 text-red-300" 
                  : "bg-green-900/50 border-green-700 text-green-300"
              }`}>
                <p className="text-sm text-center">{notification.message}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
