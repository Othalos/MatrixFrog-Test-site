"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, maxUint256 } from "viem";
import { AlertTriangle, Wallet, RefreshCw } from "lucide-react";
import { useWalletConnect } from "../../hooks/useWalletConnect";

import ERC20_ABI from "../../abis/ERC20.json";
import STAKING_ABI from "../../abis/Staking.json";

// --- Chain & Contract Configuration ---
const PEPU_MAINNET_ID = 97741;
const STAKING_ADDRESS = "0x0B71b6CCB73F60bED2612B1A7Cbe271b7bAf3D0E" as `0x${string}`;
const MFG_ADDRESS = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5" as `0x${string}`;
const POOL_ID = 0n;

// Define chain for viem
const pepuMainnet = {
  id: PEPU_MAINNET_ID,
  name: 'Pepu Mainnet',
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

// Live Rewards Counter Hook with Blockchain Time Sync
const useLiveRewards = (
  initialRewards: bigint,
  stakedAmount: bigint,
  dailyRewardRate: bigint,
  totalStaked: bigint,
  lastUpdateTime: number
) => {
  const [liveRewards, setLiveRewards] = useState(initialRewards);
  const [blockTimestamp, setBlockTimestamp] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Reset when initial rewards change
    setLiveRewards(initialRewards);

    // Don't start counter if no stake or no pool data
    if (stakedAmount === 0n || totalStaked === 0n || dailyRewardRate === 0n) {
      return;
    }

    // Get current block timestamp for accurate sync
    const getCurrentBlockTime = async () => {
      try {
        const client = createPublicClient({
          chain: pepuMainnet,
          transport: http('/api/rpc'),
        });

        const blockNumber = await client.getBlockNumber();
        const block = await client.getBlock({ blockNumber });
        const currentBlockTime = Number(block.timestamp);
        setBlockTimestamp(currentBlockTime);

        // Calculate rewards per second based on user's share
        const userShare = stakedAmount * BigInt(1e18) / totalStaked;
        const rewardsPerSecond = (dailyRewardRate * userShare) / (BigInt(86400) * BigInt(1e18));

        // Start live counter synchronized with blockchain time
        intervalRef.current = setInterval(() => {
          const now = Math.floor(Date.now() / 1000); // Current Unix timestamp
          const secondsElapsed = now - currentBlockTime;
          
          if (secondsElapsed > 0) {
            const additionalRewards = rewardsPerSecond * BigInt(secondsElapsed);
            setLiveRewards(initialRewards + additionalRewards);
          }
        }, 1000);

      } catch (error) {
        console.error('Failed to get block timestamp:', error);
        // Fallback to Date.now() based calculation
        const userShare = stakedAmount * BigInt(1e18) / totalStaked;
        const rewardsPerSecond = (dailyRewardRate * userShare) / (BigInt(86400) * BigInt(1e18));
        let startTime = Date.now();

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
  
  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Contract data states
  const [balance, setBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [userStakedAmount, setUserStakedAmount] = useState<bigint>(0n);
  const [pendingRewards, setPendingRewards] = useState<bigint>(0n);
  const [currentAPR, setCurrentAPR] = useState<number>(0);
  const [poolInfo, setPoolInfo] = useState<{
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

  // Live rewards counter
  const liveRewards = useLiveRewards(
    pendingRewards,
    userStakedAmount,
    poolInfo.dailyRewardRate,
    poolInfo.totalStaked,
    lastUpdateTime
  );

  // Create clients
  const publicClient = createPublicClient({
    chain: pepuMainnet,
    transport: http('/api/rpc'),
  });

  const getWalletClient = useCallback(async () => {
    if (!window.ethereum) return null;
    return createWalletClient({
      chain: pepuMainnet,
      transport: custom(window.ethereum as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }),
    });
  }, []);

  // Wallet connection handlers
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

  // Optimized contract data fetching with stable reference
  const fetchContractData = useCallback(async (userAddress: string) => {
    if (!userAddress) return;

    try {
      // Create a fresh publicClient instance to avoid stale references
      const client = createPublicClient({
        chain: pepuMainnet,
        transport: http('/api/rpc'),
      });

      const [balanceResult, allowanceResult, stakesResult, pendingResult, aprResult, poolInfoResult] = await Promise.all([
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
          args: [POOL_ID, userAddress],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'pendingRewards',
          args: [POOL_ID, userAddress],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getCurrentAPR',
          args: [POOL_ID],
        }),
        client.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getPoolInfo',
          args: [POOL_ID],
        }),
      ]);

      setBalance(balanceResult as bigint);
      setAllowance(allowanceResult as bigint);
      setUserStakedAmount((stakesResult as [bigint, bigint, bigint, bigint])[0]);
      setPendingRewards(pendingResult as bigint);
      setCurrentAPR(Number(aprResult as bigint) / 100);
      
      const poolInfoData = poolInfoResult as [string, string, bigint, bigint, bigint, bigint, bigint, boolean];
      setPoolInfo({
        totalStaked: poolInfoData[2],
        rewardBudget: poolInfoData[3],
        distributionDays: Number(poolInfoData[4]),
        dailyRewardRate: poolInfoData[6]
      });
      
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Failed to read contract data:', error);
    }
  }, []); // Empty dependency array is correct here

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    if (!address || isRefreshing) return;
    
    setIsRefreshing(true);
    await fetchContractData(address);
    setIsRefreshing(false);
  }, [address, fetchContractData, isRefreshing]);

  // Smart polling - optimized for production
  useEffect(() => {
    if (!isConnected || !isCorrectNetwork || !address) return;

    // Initial fetch
    fetchContractData(address);
    
    // Set up 2-minute polling interval
    const interval = setInterval(() => {
      fetchContractData(address);
    }, 120000); // 2 minutes

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isCorrectNetwork, address]);

  // Submit transaction with auto-refresh
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
      if (!isCorrectNetwork) {
        setNotification({ 
          message: "Switching to correct network...", 
          type: "success" 
        });

        try {
          await switchToPepeUnchained();
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch {
          setNotification({ 
            message: "Please manually switch to the correct network in your wallet", 
            type: "error" 
          });
          setIsLoading(false);
          return;
        }
      }

      const walletClient = await getWalletClient();
      if (!walletClient) throw new Error('No wallet client');

      const hash = await walletClient.writeContract({
        ...args,
        account: address as `0x${string}`,
      });

      setNotification({ 
        message: "Transaction submitted! Waiting for confirmation...", 
        type: "success" 
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
      if (receipt.status === 'success') {
        setNotification({ 
          message: "Transaction confirmed! Refreshing data...", 
          type: "success" 
        });
      
        // Auto-refresh after successful transaction
        setTimeout(() => {
          fetchContractData(address);
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
  }, [address, getWalletClient, publicClient, fetchContractData, isCorrectNetwork, switchToPepeUnchained]);

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
      functionName: 'stakeTokens',
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

  // Derived values
  const stakeAmountBN = stakeAmount ? parseUnits(stakeAmount, 18) : 0n;
  const needsApproval = stakeAmountBN > 0n && allowance < stakeAmountBN;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-black border border-green-700/50 text-green-300 font-mono">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl text-green-400">
            Dynamic Staking: MFG → PTX at {formatDisplayNumber(currentAPR, 2)}% APR
          </CardTitle>
          <div className="text-sm text-green-300 mt-2">
            Rewards Budget: {formatDisplayNumber(formatUnits(poolInfo.rewardBudget, 18))} PTX | 
            Days Remaining: {poolInfo.distributionDays} | 
            Total Staked: {formatDisplayNumber(formatUnits(poolInfo.totalStaked, 18))} MFG
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
              {/* Wallet Balance */}
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
                    {formatDisplayNumber(formatUnits(balance, 18), 2)} MFG
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

              {/* Staking Input Section */}
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
                      value={stakeAmount} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeAmount(e.target.value)} 
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
                      onClick={handleMaxClick} 
                      disabled={isLoading || balance === 0n}
                      variant="secondary"
                      className="!w-auto px-6"
                    >
                      MAX
                    </MatrixButton>
                  </div>
                  
                  {needsApproval ? (
                    <MatrixButton 
                      onClick={handleApprove} 
                      disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                      variant="warning"
                    >
                      {isLoading ? "Processing..." : "Approve MFG"}
                    </MatrixButton>
                  ) : (
                    <MatrixButton 
                      onClick={handleStake} 
                      disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
                    >
                      {isLoading ? "Processing..." : "Stake MFG"}
                    </MatrixButton>
                  )}
                </div>
              </div>

              {/* Staked & Rewards Section */}
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
                        {formatDisplayNumber(formatUnits(userStakedAmount, 18), 2)}
                      </div>
                      <div className="text-sm text-gray-400">MFG Tokens</div>
                    </div>
                    <MatrixButton 
                      onClick={handleUnstake} 
                      disabled={isLoading || userStakedAmount === 0n}
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
                    {userStakedAmount > 0n && (
                      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
                        <span className="text-xs text-green-400 animate-pulse">● LIVE</span>
                      </div>
                    )}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="text-3xl font-bold text-white font-mono">
                        {formatDisplayNumber(formatUnits(liveRewards, 18), 2)}
                      </div>
                      <div className="text-sm text-gray-400">PTX Earned</div>
                    </div>
                    <MatrixButton 
                      onClick={handleClaim} 
                      disabled={isLoading || liveRewards === 0n}
                    >
                      {isLoading ? "Processing..." : `Claim ${formatDisplayNumber(formatUnits(liveRewards, 18), 2)} PTX`}
                    </MatrixButton>
                  </div>
                </div>
              </div>

              {/* Notification */}
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
          )}
        </div>
      </Card>
    </div>
  );
}