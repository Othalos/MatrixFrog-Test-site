"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, maxUint256 } from "viem";
import { AlertTriangle, Wallet, RefreshCw } from "lucide-react";
import { useWalletConnect } from "../../hooks/useWalletConnect";
import { pepuMainnet, PEPE_UNCHAINED_CHAIN_ID, isCorrectChain } from "../../lib/chains";

import ERC20_ABI from "../../abis/ERC20.json";
import STAKING_ABI from "../../abis/Staking.json";

// --- Contract Configuration ---
const STAKING_ADDRESS = "0x0B71b6CCB73F60bED2612B1A7Cbe271b7bAf3D0E" as `0x${string}`;
const MFG_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5" as `0x${string}`;
const PTX_ADDRESS = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2" as `0x${string}`;

// Pool configurations
const POOL_0_ID = 0n;
const POOL_1_ID = 1n;

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

// Live Rewards Counter Hook
const useLiveRewards = (
  initialRewards: bigint,
  stakedAmount: bigint,
  dailyRewardRate: bigint,
  totalStaked: bigint,
  lastUpdateTime: number
) => {
  const [liveRewards, setLiveRewards] = useState(initialRewards);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setLiveRewards(initialRewards);

    if (stakedAmount === 0n || totalStaked === 0n || dailyRewardRate === 0n) {
      return;
    }

    const getCurrentBlockTime = async () => {
      try {
        const client = createPublicClient({
          chain: pepuMainnet,
          transport: http('/api/rpc'),
        });

        const blockNumber = await client.getBlockNumber();
        const block = await client.getBlock({ blockNumber });
        const currentBlockTime = Number(block.timestamp);

        const userShare = stakedAmount * BigInt(1e18) / totalStaked;
        const rewardsPerSecond = (dailyRewardRate * userShare) / (BigInt(86400) * BigInt(1e18));

        intervalRef.current = setInterval(() => {
          const now = Math.floor(Date.now() / 1000);
          const secondsElapsed = now - currentBlockTime;
          
          if (secondsElapsed > 0) {
            const additionalRewards = rewardsPerSecond * BigInt(secondsElapsed);
            setLiveRewards(initialRewards + additionalRewards);
          }
        }, 1000);

      } catch (error) {
        console.error('Failed to get block timestamp:', error);
        const userShare = stakedAmount * BigInt(1e18) / totalStaked;
        const rewardsPerSecond = (dailyRewardRate * userShare) / (BigInt(86400) * BigInt(1e18));
        const startTime = Date.now();

        intervalRef.current = setInterval(() => {
          const now = Date.now();
          const secondsElapsed = Math.floor((now - startTime) / 1000);
          
          if (secondsElapsed > 0) {
            const additionalRewards = rewardsPerSecond * BigInt(secondsElapsed);
            setLiveRewards(initialRewards + additionalRewards);
          }
        }, 1000);
      }
    };

    getCurrentBlockTime();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialRewards, stakedAmount, dailyRewardRate, totalStaked, lastUpdateTime]);

  return liveRewards;
};

// Custom Button Component
const MatrixButton = ({ 
  onClick, 
  disabled = false, 
  children, 
  variant = "primary",
  className = ""
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "warning" | "cancel" | "refresh";
  className?: string;
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: '#16a34a',
          color: '#000000',
          border: '2px solid #16a34a',
          hoverBg: '#15803d'
        };
      case "secondary":
        return {
          backgroundColor: '#166534',
          color: '#4ade80',
          border: '2px solid #15803d',
          hoverBg: '#15803d'
        };
      case "warning":
        return {
          backgroundColor: '#a16207',
          color: '#fbbf24',
          border: '2px solid #d97706',
          hoverBg: '#92400e'
        };
      case "cancel":
        return {
          backgroundColor: '#374151',
          color: '#d1d5db',
          border: '2px solid #6b7280',
          hoverBg: '#4b5563'
        };
      case "refresh":
        return {
          backgroundColor: '#166534',
          color: '#4ade80',
          border: '2px solid #15803d',
          hoverBg: '#15803d'
        };
      default:
        return {
          backgroundColor: '#16a34a',
          color: '#000000',
          border: '2px solid #16a34a',
          hoverBg: '#15803d'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-3 font-bold rounded-md transition-all duration-200 disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'monospace',
        width: className.includes('w-auto') ? 'auto' : '100%'
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = styles.hoverBg;
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = styles.backgroundColor;
        }
      }}
    >
      {children}
    </button>
  );
};

// --- Main Component ---
export default function StakingSection() {
  const {
    isConnected,
    address,
    isCorrectNetwork,
    isConnecting,
    connectMetaMask,
    connectWalletConnect,
    connectCoinbase,
    switchToPepeUnchained,
  } = useWalletConnect();
  
  const [stakeAmountPool0, setStakeAmountPool0] = useState("");
  const [balanceMFG, setBalanceMFG] = useState<bigint>(0n);
  const [allowanceMFG, setAllowanceMFG] = useState<bigint>(0n);
  const [userStakedPool0, setUserStakedPool0] = useState<bigint>(0n);
  const [pendingRewardsPool0, setPendingRewardsPool0] = useState<bigint>(0n);
  const [currentAPRPool0, setCurrentAPRPool0] = useState<number>(0);
  const [poolInfoPool0, setPoolInfoPool0] = useState<{
    totalStaked: bigint;
    rewardBudget: bigint;
    distributionDays: number;
    dailyRewardRate: bigint;
  }>({
    totalStaked: 0n,
    rewardBudget: 0n,
    distributionDays: 0,
    dailyRewardRate: 0n
  });

  const [stakeAmountPool1, setStakeAmountPool1] = useState("");
  const [balancePTX, setBalancePTX] = useState<bigint>(0n);
  const [allowancePTX, setAllowancePTX] = useState<bigint>(0n);
  const [userStakedPool1, setUserStakedPool1] = useState<bigint>(0n);
  const [pendingRewardsPool1, setPendingRewardsPool1] = useState<bigint>(0n);
  const [currentAPRPool1, setCurrentAPRPool1] = useState<number>(0);
  const [poolInfoPool1, setPoolInfoPool1] = useState<{
    totalStaked: bigint;
    rewardBudget: bigint;
    distributionDays: number;
    dailyRewardRate: bigint;
  }>({
    totalStaked: 0n,
    rewardBudget: 0n,
    distributionDays: 0,
    dailyRewardRate: 0n
  });

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  const liveRewardsPool0 = useLiveRewards(
    pendingRewardsPool0,
    userStakedPool0,
    poolInfoPool0.dailyRewardRate,
    poolInfoPool0.totalStaked,
    lastUpdateTime
  );

  const liveRewardsPool1 = useLiveRewards(
    pendingRewardsPool1,
    userStakedPool1,
    poolInfoPool1.dailyRewardRate,
    poolInfoPool1.totalStaked,
    lastUpdateTime
  );

  const publicClient = createPublicClient({
    chain: pepuMainnet,
    transport: http('/api/rpc', {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  });

  const getWalletClient = useCallback(async () => {
    if (!window.ethereum) return null;
    
    return createWalletClient({
      chain: pepuMainnet,
      transport: custom(window.ethereum, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
  }, []);

  useEffect(() => {
    console.log('Wallet State Debug:', {
      isConnected,
      address,
      chainId: isConnected ? 'connected' : 'not connected',
      expectedChainId: PEPE_UNCHAINED_CHAIN_ID,
      isCorrectNetwork,
      timestamp: new Date().toISOString()
    });
  }, [isConnected, address, isCorrectNetwork]);

  const handleConnectMetaMask = useCallback(() => {
    connectMetaMask();
    setShowWalletOptions(false);
  }, [connectMetaMask]);

  const handleConnectWalletConnect = useCallback(() => {
    connectWalletConnect();
    setShowWalletOptions(false);
  }, [connectWalletConnect]);

  const handleConnectCoinbase = useCallback(() => {
    connectCoinbase();
    setShowWalletOptions(false);
  }, [connectCoinbase]);

  const fetchContractData = useCallback(async (userAddress: string) => {
    if (!userAddress) return;

    try {
      const client = createPublicClient({
        chain: pepuMainnet,
        transport: http('/api/rpc', {
          batch: true,
          retryCount: 3,
          retryDelay: 1000,
        }),
      });

      const [
        balanceMFGResult,
        allowanceMFGResult,
        stakesPool0Result,
        pendingPool0Result,
        aprPool0Result,
        poolInfo0Result,
        balancePTXResult,
        allowancePTXResult,
        stakesPool1Result,
        pendingPool1Result,
        aprPool1Result,
        poolInfo1Result,
      ] = await Promise.all([
        client.readContract({
          address: MFG_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'balanceOf',
          args: [userAddress],
        }),
        client.readContract({
          address: MFG_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'allowance',
          args: [userAddress, STAKING_ADDRESS],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'stakes',
          args: [POOL_0_ID, userAddress],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'pendingRewards',
          args: [POOL_0_ID, userAddress],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getCurrentAPR',
          args: [POOL_0_ID],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getPoolInfo',
          args: [POOL_0_ID],
        }),
        client.readContract({
          address: PTX_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'balanceOf',
          args: [userAddress],
        }),
        client.readContract({
          address: PTX_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'allowance',
          args: [userAddress, STAKING_ADDRESS],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'stakes',
          args: [POOL_1_ID, userAddress],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'pendingRewards',
          args: [POOL_1_ID, userAddress],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getCurrentAPR',
          args: [POOL_1_ID],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getPoolInfo',
          args: [POOL_1_ID],
        }),
      ]);

      setBalanceMFG(balanceMFGResult as bigint);
      setAllowanceMFG(allowanceMFGResult as bigint);
      setUserStakedPool0((stakesPool0Result as [bigint, bigint, bigint, bigint])[0]);
      setPendingRewardsPool0(pendingPool0Result as bigint);
      setCurrentAPRPool0(Number(aprPool0Result as bigint) / 100);
      
      const poolInfo0Data = poolInfo0Result as [string, string, bigint, bigint, bigint, bigint, bigint, boolean];
      setPoolInfoPool0({
        totalStaked: poolInfo0Data[2],
        rewardBudget: poolInfo0Data[3],
        distributionDays: Number(poolInfo0Data[4]),
        dailyRewardRate: poolInfo0Data[6]
      });

      setBalancePTX(balancePTXResult as bigint);
      setAllowancePTX(allowancePTXResult as bigint);
      setUserStakedPool1((stakesPool1Result as [bigint, bigint, bigint, bigint])[0]);
      setPendingRewardsPool1(pendingPool1Result as bigint);
      setCurrentAPRPool1(Number(aprPool1Result as bigint) / 100);
      
      const poolInfo1Data = poolInfo1Result as [string, string, bigint, bigint, bigint, bigint, bigint, boolean];
      setPoolInfoPool1({
        totalStaked: poolInfo1Data[2],
        rewardBudget: poolInfo1Data[3],
        distributionDays: Number(poolInfo1Data[4]),
        dailyRewardRate: poolInfo1Data[6]
      });
      
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Failed to read contract data:', error);
    }
  }, []);

  const handleManualRefresh = useCallback(async () => {
    if (!address || isRefreshing) return;
    
    setIsRefreshing(true);
    await fetchContractData(address);
    setIsRefreshing(false);
  }, [address, fetchContractData, isRefreshing]);

  useEffect(() => {
    if (!isConnected || !isCorrectNetwork || !address) return;

    fetchContractData(address);
    
    const interval = setInterval(() => {
      fetchContractData(address);
    }, 120000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isCorrectNetwork, address]);

  const submitTransaction = useCallback(async (args: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
  }) => {
    if (!address) return;

    setIsLoading(true);
    setNotification(null);

    try {
      if (!isConnected) {
        throw new Error('Wallet not connected');
      }

      if (!isCorrectNetwork) {
        setNotification({ 
          message: "Wrong network detected. Switching to Pepe Unchained...", 
          type: "success" 
        });

        try {
          await switchToPepeUnchained();
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          const freshWalletClient = await getWalletClient();
          if (!freshWalletClient) {
            throw new Error('Failed to reconnect after network switch');
          }
          
          const currentChainId = await freshWalletClient.getChainId();
          
          if (!isCorrectChain(currentChainId)) {
            throw new Error(`Network switch incomplete`);
          }
        } catch (networkError: unknown) {
          console.error('Network switch failed:', networkError);
          setNotification({ 
            message: "Network switch failed. Please manually switch to Pepe Unchained.", 
            type: "error" 
          });
          setIsLoading(false);
          return;
        }
      }

      if (!args.address || !args.abi || !args.functionName) {
        throw new Error('Invalid contract parameters');
      }

      const walletClient = await getWalletClient();
      if (!walletClient) {
        throw new Error('Failed to create wallet client');
      }

      const hash = await walletClient.writeContract({
        ...args,
        account: address as `0x${string}`,
      });

      setNotification({ 
        message: `Transaction submitted: ${hash.slice(0, 10)}...`, 
        type: "success" 
      });

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        timeout: 60_000,
        confirmations: 1,
      });
    
      if (receipt.status === 'success') {
        setNotification({ 
          message: "Transaction confirmed successfully!", 
          type: "success" 
        });
      
        setTimeout(() => {
          fetchContractData(address);
          setNotification(null);
        }, 3000);
      } else {
        throw new Error(`Transaction failed`);
      }
    } catch (error: unknown) {
      console.error('Transaction error:', error);
      
      let errorMessage = 'Transaction failed';
      const err = error as { code?: number; message?: string };
      
      if (err.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setNotification({ 
        message: `Error: ${errorMessage}`, 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  }, [address, getWalletClient, publicClient, fetchContractData, isConnected, isCorrectNetwork, switchToPepeUnchained]);

  const handleApprovePool0 = useCallback(() => {
    submitTransaction({
      address: MFG_ADDRESS,
      abi: ERC20_ABI as readonly unknown[],
      functionName: 'approve',
      args: [STAKING_ADDRESS, maxUint256],
    });
  }, [submitTransaction]);

  const handleStakePool0 = useCallback(() => {
    if (!stakeAmountPool0 || parseFloat(stakeAmountPool0) <= 0) {
      setNotification({ message: "Please enter a valid stake amount", type: "error" });
      return;
    }

    const stakeAmountBN = parseUnits(stakeAmountPool0, 18);
    
    if (stakeAmountBN > balanceMFG) {
      setNotification({ message: "Insufficient MFG balance", type: "error" });
      return;
    }

    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'stakeTokens',
      args: [POOL_0_ID, stakeAmountBN],
    });
  }, [submitTransaction, stakeAmountPool0, balanceMFG]);

  const handleUnstakePool0 = useCallback(() => {
    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'unstake',
      args: [POOL_0_ID],
    });
  }, [submitTransaction]);

  const handleClaimPool0 = useCallback(() => {
    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'claimRewards',
      args: [POOL_0_ID],
    });
  }, [submitTransaction]);

  const handleMaxClickPool0 = useCallback(() => {
    if (balanceMFG > 0n) {
      setStakeAmountPool0(formatUnits(balanceMFG, 18));
    }
  }, [balanceMFG]);

  const handleApprovePool1 = useCallback(() => {
    submitTransaction({
      address: PTX_ADDRESS,
      abi: ERC20_ABI as readonly unknown[],
      functionName: 'approve',
      args: [STAKING_ADDRESS, maxUint256],
    });
  }, [submitTransaction]);

  const handleStakePool1 = useCallback(() => {
    if (!stakeAmountPool1 || parseFloat(stakeAmountPool1) <= 0) {
      setNotification({ message: "Please enter a valid stake amount", type: "error" });
      return;
    }

    const stakeAmountBN = parseUnits(stakeAmountPool1, 18);
    
    if (stakeAmountBN > balancePTX) {
      setNotification({ message: "Insufficient PTX balance", type: "error" });
      return;
    }

    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'stakeTokens',
      args: [POOL_1_ID, stakeAmountBN],
    });
  }, [submitTransaction, stakeAmountPool1, balancePTX]);

  const handleUnstakePool1 = useCallback(() => {
    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'unstake',
      args: [POOL_1_ID],
    });
  }, [submitTransaction]);

  const handleClaimPool1 = useCallback(() => {
    submitTransaction({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI as readonly unknown[],
      functionName: 'claimRewards',
      args: [POOL_1_ID],
    });
  }, [submitTransaction]);

  const handleMaxClickPool1 = useCallback(() => {
    if (balancePTX > 0n) {
      setStakeAmountPool1(formatUnits(balancePTX, 18));
    }
  }, [balancePTX]);

  const stakeAmountBNPool0 = stakeAmountPool0 ? parseUnits(stakeAmountPool0, 18) : 0n;
  const needsApprovalPool0 = stakeAmountBNPool0 > 0n && allowanceMFG < stakeAmountBNPool0;

  const stakeAmountBNPool1 = stakeAmountPool1 ? parseUnits(stakeAmountPool1, 18) : 0n;
  const needsApprovalPool1 = stakeAmountBNPool1 > 0n && allowancePTX < stakeAmountBNPool1;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="bg-black border border-green-700/50 text-green-300 font-mono">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl text-green-400">
            Pool 0: MFG → PTX at {formatDisplayNumber(currentAPRPool0, 2)}% APR
          </CardTitle>
          <div className="text-sm text-green-300 mt-2">
            Rewards Budget: {formatDisplayNumber(formatUnits(poolInfoPool0.rewardBudget, 18))} PTX | 
            Total Staked: {formatDisplayNumber(formatUnits(poolInfoPool0.totalStaked, 18))} MFG
          </div>
        </CardHeader>
        
        <div style={{ padding: '16px', margin: '0 24px 24px 24px' }}>
          {!isConnected ? (
            <div style={{ 
              padding: '32px', 
              border: '1px solid #15803d', 
              borderRadius: '8px', 
              backgroundColor: '#000000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px'
            }}>
              <h3 className="text-lg font-bold text-green-400">Connect Wallet to Continue</h3>
              
              {!showWalletOptions ? (
                <MatrixButton onClick={() => setShowWalletOptions(true)} disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </MatrixButton>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <MatrixButton onClick={handleConnectMetaMask} disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : "MetaMask"}
                  </MatrixButton>
                  <MatrixButton onClick={handleConnectWalletConnect} disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : "WalletConnect"}
                  </MatrixButton>
                  <MatrixButton onClick={handleConnectCoinbase} disabled={isConnecting}>
                    {isConnecting ? "Connecting..." : "Coinbase Wallet"}
                  </MatrixButton>
                  <MatrixButton onClick={() => setShowWalletOptions(false)} variant="cancel" disabled={isConnecting}>
                    Cancel
                  </MatrixButton>
                </div>
              )}
            </div>
          ) : !isCorrectNetwork ? (
            <div style={{ 
              padding: '32px', 
              border: '1px solid #d97706', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(120, 53, 15, 0.8)',
              color: '#fbbf24',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={24} />
                <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Wrong Network</span>
              </div>
              <p style={{ textAlign: 'center' }}>Please switch to the correct network</p>
              <MatrixButton onClick={switchToPepeUnchained} variant="warning">
                Switch Network
              </MatrixButton>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ 
                padding: '24px', 
                border: '1px solid rgba(21, 128, 61, 0.5)', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={20} className="text-green-400" />
                  <span className="text-green-400 font-bold">Your MFG Balance:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="text-2xl font-bold text-white">
                    {formatDisplayNumber(formatUnits(balanceMFG, 18), 2)} MFG
                  </span>
                  <MatrixButton 
                    onClick={handleManualRefresh} 
                    disabled={isRefreshing}
                    variant="refresh"
                    className="!w-auto px-3 py-1 text-xs"
                  >
                    <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
                  </MatrixButton>
                </div>
              </div>

              <div style={{ 
                border: '1px solid rgba(21, 128, 61, 0.5)', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(21, 128, 61, 0.05)'
              }}>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 className="text-lg font-bold text-green-400 text-center">Stake MFG Tokens</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="number" 
                      value={stakeAmountPool0} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeAmountPool0(e.target.value)} 
                      placeholder="Enter amount to stake" 
                      style={{
                        flex: 1,
                        backgroundColor: '#000000',
                        border: '1px solid rgba(21, 128, 61, 0.5)',
                        padding: '12px',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontFamily: 'monospace'
                      }}
                      disabled={isLoading}
                    />
                    <MatrixButton 
                      onClick={handleMaxClickPool0} 
                      disabled={isLoading || balanceMFG === 0n}
                      variant="secondary"
                      className="!w-auto px-6"
                    >
                      MAX
                    </MatrixButton>
                  </div>
                  
                  {needsApprovalPool0 ? (
                    <MatrixButton 
                      onClick={handleApprovePool0} 
                      disabled={isLoading || !stakeAmountPool0 || parseFloat(stakeAmountPool0) <= 0}
                      variant="warning"
                    >
                      {isLoading ? "Processing..." : "Approve MFG"}
                    </MatrixButton>
                  ) : (
                    <MatrixButton 
                      onClick={handleStakePool0} 
                      disabled={isLoading || !stakeAmountPool0 || parseFloat(stakeAmountPool0) <= 0}
                    >
                      {isLoading ? "Processing..." : "Stake MFG"}
                    </MatrixButton>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ 
                  border: '1px solid rgba(21, 128, 61, 0.5)', 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }}>
                  <div style={{ padding: '24px' }}>
                    <h3 className="text-lg font-bold text-blue-400 text-center mb-6">Staked MFG</h3>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="text-3xl font-bold text-white">
                        {formatDisplayNumber(formatUnits(userStakedPool0, 18), 2)}
                      </div>
                      <div className="text-sm text-gray-400">MFG Tokens</div>
                    </div>
                    <MatrixButton 
                      onClick={handleUnstakePool0} 
                      disabled={isLoading || userStakedPool0 === 0n}
                    >
                      {isLoading ? "Processing..." : "Unstake All"}
                    </MatrixButton>
                  </div>
                </div>

                <div style={{ 
                  border: '1px solid rgba(21, 128, 61, 0.5)', 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  position: 'relative'
                }}>
                  <div style={{ padding: '24px' }}>
                    <h3 className="text-lg font-bold text-purple-400 text-center mb-6">PTX Rewards</h3>
                    {userStakedPool0 > 0n && (
                      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                        <span className="text-xs text-green-400 animate-pulse">● LIVE</span>
                      </div>
                    )}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="text-3xl font-bold text-white font-mono">
                        {formatDisplayNumber(formatUnits(liveRewardsPool0, 18), 2)}
                      </div>
                      <div className="text-sm text-gray-400">PTX Earned</div>
                    </div>
                    <MatrixButton 
                      onClick={handleClaimPool0} 
                      disabled={isLoading || liveRewardsPool0 === 0n}
                    >
                      {isLoading ? "Processing..." : `Claim ${formatDisplayNumber(formatUnits(liveRewardsPool0, 18), 2)} PTX`}
                    </MatrixButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-black border border-purple-700/50 text-purple-300 font-mono">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl text-purple-400">
            Pool 1: PTX → PTX at {formatDisplayNumber(currentAPRPool1, 2)}% APR
          </CardTitle>
          <div className="text-sm text-purple-300 mt-2">
            Rewards Budget: {formatDisplayNumber(formatUnits(poolInfoPool1.rewardBudget, 18))} PTX | 
            Total Staked: {formatDisplayNumber(formatUnits(poolInfoPool1.totalStaked, 18))} PTX
          </div>
        </CardHeader>
        
        <div style={{ padding: '16px', margin: '0 24px 24px 24px' }}>
          {!isConnected ? (
            <div className="text-center p-8">
              <p className="text-purple-400">Connect your wallet to stake PTX</p>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="text-center p-8">
              <p className="text-purple-400">Please switch to the correct network</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ 
                padding: '24px', 
                border: '1px solid rgba(147, 51, 234, 0.5)', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(147, 51, 234, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wallet size={20} className="text-purple-400" />
                  <span className="text-purple-400 font-bold">Your PTX Balance:</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {formatDisplayNumber(formatUnits(balancePTX, 18), 2)} PTX
                </span>
              </div>

              <div style={{ 
                border: '1px solid rgba(147, 51, 234, 0.5)', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(147, 51, 234, 0.05)'
              }}>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <h3 className="text-lg font-bold text-purple-400 text-center">Stake PTX Tokens</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input 
                      type="number" 
                      value={stakeAmountPool1} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeAmountPool1(e.target.value)} 
                      placeholder="Enter amount to stake" 
                      style={{
                        flex: 1,
                        backgroundColor: '#000000',
                        border: '1px solid rgba(147, 51, 234, 0.5)',
                        padding: '12px',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontFamily: 'monospace'
                      }}
                      disabled={isLoading}
                    />
                    <MatrixButton 
                      onClick={handleMaxClickPool1} 
                      disabled={isLoading || balancePTX === 0n}
                      variant="secondary"
                      className="!w-auto px-6"
                    >
                      MAX
                    </MatrixButton>
                  </div>
                  
                  {needsApprovalPool1 ? (
                    <MatrixButton 
                      onClick={handleApprovePool1} 
                      disabled={isLoading || !stakeAmountPool1 || parseFloat(stakeAmountPool1) <= 0}
                      variant="warning"
                    >
                      {isLoading ? "Processing..." : "Approve PTX"}
                    </MatrixButton>
                  ) : (
                    <MatrixButton 
                      onClick={handleStakePool1} 
                      disabled={isLoading || !stakeAmountPool1 || parseFloat(stakeAmountPool1) <= 0}
                    >
                      {isLoading ? "Processing..." : "Stake PTX"}
                    </MatrixButton>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ 
                  border: '1px solid rgba(147, 51, 234, 0.5)', 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)'
                }}>
                  <div style={{ padding: '24px' }}>
                    <h3 className="text-lg font-bold text-blue-400 text-center mb-6">Staked PTX</h3>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="text-3xl font-bold text-white">
                        {formatDisplayNumber(formatUnits(userStakedPool1, 18), 2)}
                      </div>
                      <div className="text-sm text-gray-400">PTX Tokens</div>
                    </div>
                    <MatrixButton 
                      onClick={handleUnstakePool1} 
                      disabled={isLoading || userStakedPool1 === 0n}
                    >
                      {isLoading ? "Processing..." : "Unstake All"}
                    </MatrixButton>
                  </div>
                </div>

                <div style={{ 
                  border: '1px solid rgba(147, 51, 234, 0.5)', 
                  borderRadius: '8px', 
                  backgroundColor: 'rgba(236, 72, 153, 0.1)',
                  position: 'relative'
                }}>
                  <div style={{ padding: '24px' }}>
                    <h3 className="text-lg font-bold text-pink-400 text-center mb-6">PTX Rewards</h3>
                    {userStakedPool1 > 0n && (
                      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                        <span className="text-xs text-purple-400 animate-pulse">● LIVE</span>
                      </div>
                    )}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="text-3xl font-bold text-white font-mono">
                        {formatDisplayNumber(formatUnits(liveRewardsPool1, 18), 2)}
                      </div>
                      <div className="text-sm text-gray-400">PTX Earned</div>
                    </div>
                    <MatrixButton 
                      onClick={handleClaimPool1} 
                      disabled={isLoading || liveRewardsPool1 === 0n}
                    >
                      {isLoading ? "Processing..." : `Claim ${formatDisplayNumber(formatUnits(liveRewardsPool1, 18), 2)} PTX`}
                    </MatrixButton>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {notification && (
        <div style={{
          padding: '24px',
          borderRadius: '8px',
          border: notification.type === "error" ? '2px solid #ef4444' : '2px solid #22c55e',
          backgroundColor: notification.type === "error" ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: notification.type === "error" ? '#fca5a5' : '#bbf7d0'
        }}>
          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{notification.message}</p>
        </div>
      )}
    </div>
  );
}
