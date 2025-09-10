"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { parseUnits, formatUnits, maxUint256, type Hash } from "viem";
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
      refetchInterval: 5000 // Refetch every 5 seconds
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

  const { writeContract, isPending, error: writeError, data: writeData } = useWriteContract();
  const { isSuccess: txConfirmed, isLoading: isConfirming } = useWaitForTransactionReceipt({ 
    hash: txHash,
    confirmations: 1
  });

  // --- Refetch data when a transaction is confirmed ---
  const refetchAllData = useCallback(() => {
    refetchAllowance();
    refetchBalance();
    refetchUserStake();
    refetchPendingRewards();
  }, [refetchAllowance, refetchBalance, refetchUserStake, refetchPendingRewards]);

  // Monitor transaction confirmations
  useEffect(() => {
    if (txConfirmed && txHash) {
      setNotification({ message: "Transaction confirmed! Data refreshing...", type: "success" });
      
      // Small delay to ensure blockchain state is updated
      setTimeout(() => {
        refetchAllData();
        setTxHash(undefined);
        
        // Clear notification after data refresh
        setTimeout(() => {
          setNotification(null);
        }, 2000);
      }, 1000);
    }
  }, [txConfirmed, txHash, refetchAllData]);

  // Handle write contract errors
  useEffect(() => {
    if (writeError) {
      setNotification({ 
        message: `Error: ${writeError.message || 'Transaction failed'}`, 
        type: "error" 
      });
      setTxHash(undefined);
    }
  }, [writeError]);

  // Set transaction hash when write is successful
  useEffect(() => {
    if (writeData && !txHash) {
      setTxHash(writeData);
      setNotification({ 
        message: "Transaction submitted! Waiting for confirmation...", 
        type: "success" 
      });
    }
  }, [writeData, txHash]);

  // --- Derived Values ---
  const allowance: bigint = (allowanceData as bigint) ?? 0n;
  const balance: bigint = (balanceData as bigint) ?? 0n;
  const stakeAmountBN: bigint = stakeAmount && !isNaN(parseFloat(stakeAmount)) 
    ? parseUnits(stakeAmount, 18) 
    : 0n;
  const needsApproval = stakeAmountBN > 0n && allowance < stakeAmountBN;
  const userStakedAmount = (userStakeData as [bigint])?.[0] ?? 0n;
  const pendingRewards = (pendingRewardsData as bigint) ?? 0n;
  const isLoading = isPending || isConfirming;

  // Debug current state
  console.log("Current state:", {
    stakeAmount,
    stakeAmountBN: stakeAmountBN.toString(),
    allowance: allowance.toString(),
    needsApproval,
    balance: balance.toString(),
    isLoading
  });

  // --- Actions ---
  const submitTransaction = useCallback((args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) => {
    setNotification(null);
    writeContract(args);
  }, [writeContract]);

  const handleApprove = useCallback(() => {
    if (!stakeAmountBN || stakeAmountBN === 0n) {
      setNotification({ message: "Please enter a stake amount first", type: "error" });
      return;
    }
    
    submitTransaction({ 
      address: MFG_ADDRESS, 
      abi: ERC20_ABI, 
      functionName: "approve", 
      args: [STAKING_ADDRESS, maxUint256] 
    });
  }, [submitTransaction, stakeAmountBN]);

  const handleStake = useCallback(() => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      setNotification({ message: "Please enter a valid stake amount", type: "error" });
      return;
    }

    if (stakeAmountBN > balance) {
      setNotification({ message: "Insufficient MFG balance", type: "error" });
      return;
    }

    if (needsApproval) {
      setNotification({ message: "Please approve the transaction first", type: "error" });
      return;
    }

    submitTransaction({ 
      address: STAKING_ADDRESS, 
      abi: STAKING_ABI, 
      functionName: "stake", 
      args: [POOL_ID, stakeAmountBN] 
    });
  }, [submitTransaction, stakeAmount, stakeAmountBN, balance, needsApproval]);

  const handleUnstake = useCallback(() => {
    if (userStakedAmount === 0n) {
      setNotification({ message: "No MFG staked to unstake", type: "error" });
      return;
    }
    
    submitTransaction({ 
      address: STAKING_ADDRESS, 
      abi: STAKING_ABI, 
      functionName: "unstake", 
      args: [POOL_ID] 
    });
  }, [submitTransaction, userStakedAmount]);

  const handleClaim = useCallback(() => {
    if (pendingRewards === 0n) {
      setNotification({ message: "No PTX rewards to claim", type: "error" });
      return;
    }
    
    submitTransaction({ 
      address: STAKING_ADDRESS, 
      abi: STAKING_ABI, 
      functionName: "claimRewards", 
      args: [POOL_ID] 
    });
  }, [submitTransaction, pendingRewards]);

  const handleMaxClick = useCallback(() => {
    if (balance > 0n) {
      const maxAmount = formatUnits(balance, 18);
      setStakeAmount(maxAmount);
    }
  }, [balance]);

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                <Button 
                  onClick={() => connect({ connector: injected() })} 
                  className="w-full px-4 py-3 font-bold rounded-md border border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)]"
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
                  className="w-full px-4 py-3 font-bold rounded-md border border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)]"
                >
                  WalletConnect
                </Button>
                <Button 
                  onClick={() => connect({ 
                    connector: coinbaseWallet({ 
                      appName: "MatrixFrog",
                      appLogoUrl: "https://matrixfrog.one/logo.png"
                    }) 
                  })} 
                  className="w-full px-4 py-3 font-bold rounded-md border border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)]"
                >
                  Coinbase
                </Button>
              </div>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="p-6 rounded-md bg-yellow-900/80 text-yellow-300 border border-yellow-700 flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={24} />
                <span className="font-bold text-lg">Wrong Network</span>
              </div>
              <p className="text-center">Please switch to Pepu Testnet to use staking</p>
              <Button 
                onClick={() => switchChain({ chainId: PEPU_TESTNET_ID })} 
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
                    className="w-full px-4 py-3 font-bold rounded-md border border-yellow-500 bg-yellow-900/50 text-yellow-300 hover:enabled:bg-yellow-800/60 hover:enabled:shadow-[0_0_15px_rgba(251,191,36,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Processing..." : "Approve MFG"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStake} 
                    disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0 || needsApproval} 
                    className="w-full px-4 py-3 font-bold rounded-md border border-green-500 bg-green-900/50 text-green-300 hover:enabled:bg-green-800/60 hover:enabled:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Processing..." : "Stake MFG"}
                  </Button>
                )}
              </div>

              {/* Staked & Rewards Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Staked Tokens */}
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
                    className="w-full px-4 py-3 font-bold rounded-md border border-red-500 bg-red-900/50 text-red-300 hover:enabled:bg-red-800/60 hover:enabled:shadow-[0_0_15px_rgba(239,68,68,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Processing..." : "Unstake All"}
                  </Button>
                </div>

                {/* Pending Rewards */}
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
                    className="w-full px-4 py-3 font-bold rounded-md border border-purple-500 bg-purple-900/50 text-purple-300 hover:enabled:bg-purple-800/60 hover:enabled:shadow-[0_0_15px_rgba(168,85,247,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
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
