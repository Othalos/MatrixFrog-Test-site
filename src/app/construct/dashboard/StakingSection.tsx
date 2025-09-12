"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../../components/ui/card";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits, maxUint256 } from "viem";
import { AlertTriangle, Wallet, Pause } from "lucide-react";
import { useConnect, useAccount, useSwitchChain } from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// **FIX**: Corrected relative path to the abis folder
import ERC20_ABI from "../../abis/ERC20.json";
import STAKING_ABI from "../../abis/Staking.json";

// --- Chain & Contract Configuration ---
const PEPU_TESTNET_ID = 97740;
const STAKING_ADDRESS = "0x3B91b60645ad174B8B2BC54Efb91F01E8ed42126" as `0x${string}`;
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

// Type for window.ethereum to avoid TypeScript errors
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

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

// Custom Button Component that overrides all styles
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
  variant?: "primary" | "secondary" | "warning" | "cancel" | "emergency";
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
      case "emergency":
        return {
          backgroundColor: '#dc2626',
          color: '#ffffff',
          border: '2px solid #ef4444',
          hoverBg: '#b91c1c'
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
      className={`w-full px-4 py-3 font-bold rounded-md transition-all duration-200 disabled:opacity-50 ${className}`}
      style={{
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'monospace'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = styles.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = styles.backgroundColor;
        }
      }}
    >
      {children}
    </button>
  );
};

// Type definitions for contract events
interface EmergencyWithdrawEvent {
  args?: {
    user?: string;
    token?: string;
    amount?: bigint;
  };
}

interface StakeEvent {
  args?: {
    user?: string;
    poolId?: bigint;
    amount?: bigint;
  };
}

interface RewardsClaimedEvent {
  args?: {
    user?: string;
    poolId?: bigint;
    reward?: bigint;
  };
}

interface EmergencyPauseEvent {
  args?: {
    paused?: boolean;
    rewardsEnabled?: boolean;
  };
}

interface RewardsToggleEvent {
  args?: {
    enabled?: boolean;
  };
}

// --- Main Component ---
export default function StakingSection() {
  const { address, isConnected, chain } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  
  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  
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

  // NEW: Emergency status tracking
  const [emergencyStatus, setEmergencyStatus] = useState<{
    isPaused: boolean;
    rewardsEnabled: boolean;
  }>({
    isPaused: false,
    rewardsEnabled: true
  });

  // NEW: Event listener cleanup
  const eventCleanupRef = useRef<(() => void) | null>(null);

  const isCorrectNetwork = chain?.id === PEPU_TESTNET_ID;

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

  // Read contract data
  const readContractData = useCallback(async () => {
    if (!address || !isCorrectNetwork) return;

    try {
      const [balanceResult, allowanceResult, stakesResult, pendingResult, aprResult, poolInfoResult, emergencyStatusResult] = await Promise.all([
        publicClient.readContract({
          address: MFG_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: MFG_ADDRESS,
          abi: ERC20_ABI as readonly unknown[],
          functionName: 'allowance',
          args: [address, STAKING_ADDRESS],
        }),
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'stakes',
          args: [POOL_ID, address],
        }),
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'pendingRewards',
          args: [POOL_ID, address],
        }),
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getCurrentAPR',
          args: [POOL_ID],
        }),
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getPoolInfo',
          args: [POOL_ID],
        }),
        // NEW: Read emergency status
        publicClient.readContract({
          address: STAKING_ADDRESS,
          abi: STAKING_ABI as readonly unknown[],
          functionName: 'getEmergencyStatus',
          args: [],
        }),
      ]);

      setBalance(balanceResult as bigint);
      setAllowance(allowanceResult as bigint);
      setUserStakedAmount((stakesResult as [bigint, bigint, bigint, bigint])[0]);
      setPendingRewards(pendingResult as bigint);
      setCurrentAPR(Number(aprResult as bigint) / 100); // Convert basis points to percentage
      
      const poolInfoData = poolInfoResult as [string, string, bigint, bigint, bigint, bigint, bigint, boolean];
      setPoolInfo({
        totalStaked: poolInfoData[2],
        rewardBudget: poolInfoData[3],
        distributionDays: Number(poolInfoData[4]),
        dailyRewardRate: poolInfoData[6]
      });

      // NEW: Set emergency status
      const emergencyData = emergencyStatusResult as [boolean, boolean];
      setEmergencyStatus({
        isPaused: emergencyData[0],
        rewardsEnabled: emergencyData[1]
      });

    } catch (error) {
      console.error('Failed to read contract data:', error);
    }
  }, [address, isCorrectNetwork, publicClient]);

  // NEW: Setup event listeners for real-time updates
  const setupEventListeners = useCallback(async () => {
    if (!address || !isCorrectNetwork) return;

    try {
      // Clean up existing listeners
      if (eventCleanupRef.current) {
        eventCleanupRef.current();
      }

      const walletClient = await getWalletClient();
      if (!walletClient) return;

      console.log("Setting up event listeners for address:", address);

      // Listen for Emergency Token Withdraw events
      const unsubEmergencyWithdraw = publicClient.watchContractEvent({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI as readonly unknown[],
        eventName: 'EmergencyTokenWithdraw',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const logData = log as EmergencyWithdrawEvent;
            const { args } = logData;
            if (args?.user?.toLowerCase() === address.toLowerCase()) {
              console.log("Emergency withdraw detected:", args);
              setNotification({
                message: `Emergency withdrawal of ${formatUnits(args.amount || 0n, 18)} tokens completed`,
                type: "info"
              });
              // Force refresh data
              setTimeout(() => readContractData(), 1000);
            }
          });
        }
      });

      // Listen for Staked events
      const unsubStaked = publicClient.watchContractEvent({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI as readonly unknown[],
        eventName: 'Staked',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const logData = log as StakeEvent;
            const { args } = logData;
            if (args?.user?.toLowerCase() === address.toLowerCase()) {
              console.log("Stake event detected:", args);
              setTimeout(() => readContractData(), 1000);
            }
          });
        }
      });

      // Listen for Unstaked events
      const unsubUnstaked = publicClient.watchContractEvent({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI as readonly unknown[],
        eventName: 'Unstaked',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const logData = log as StakeEvent;
            const { args } = logData;
            if (args?.user?.toLowerCase() === address.toLowerCase()) {
              console.log("Unstake event detected:", args);
              setTimeout(() => readContractData(), 1000);
            }
          });
        }
      });

      // Listen for RewardsClaimed events
      const unsubRewardsClaimed = publicClient.watchContractEvent({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI as readonly unknown[],
        eventName: 'RewardsClaimed',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const logData = log as RewardsClaimedEvent;
            const { args } = logData;
            if (args?.user?.toLowerCase() === address.toLowerCase()) {
              console.log("Rewards claimed event detected:", args);
              setNotification({
                message: `Successfully claimed ${formatUnits(args.reward || 0n, 18)} PTX rewards`,
                type: "success"
              });
              setTimeout(() => readContractData(), 1000);
            }
          });
        }
      });

      // Listen for Emergency Pause events
      const unsubEmergencyPause = publicClient.watchContractEvent({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI as readonly unknown[],
        eventName: 'EmergencyPauseActivated',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const logData = log as EmergencyPauseEvent;
            const { args } = logData;
            console.log("Emergency pause status changed:", args);
            setEmergencyStatus({
              isPaused: args?.paused || false,
              rewardsEnabled: args?.rewardsEnabled || false
            });
            if (args?.paused) {
              setNotification({
                message: "Emergency pause activated - Staking disabled, rewards stopped. You can still unstake.",
                type: "error"
              });
            } else {
              setNotification({
                message: "Emergency pause lifted - Normal operations resumed",
                type: "success"
              });
            }
          });
        }
      });

      // Listen for Rewards Toggle events
      const unsubRewardsToggle = publicClient.watchContractEvent({
        address: STAKING_ADDRESS,
        abi: STAKING_ABI as readonly unknown[],
        eventName: 'RewardsToggled',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const logData = log as RewardsToggleEvent;
            const { args } = logData;
            console.log("Rewards toggled:", args);
            setEmergencyStatus(prev => ({
              ...prev,
              rewardsEnabled: args?.enabled || false
            }));
            setNotification({
              message: args?.enabled ? "Rewards re-enabled" : "Rewards stopped",
              type: args?.enabled ? "success" : "info"
            });
          });
        }
      });

      // Store cleanup function
      eventCleanupRef.current = () => {
        unsubEmergencyWithdraw();
        unsubStaked();
        unsubUnstaked();
        unsubRewardsClaimed();
        unsubEmergencyPause();
        unsubRewardsToggle();
      };

    } catch (error) {
      console.error("Failed to setup event listeners:", error);
    }
  }, [address, isCorrectNetwork, publicClient, getWalletClient, readContractData]);

  // Wallet connection functions using wagmi
  const connectMetaMask = useCallback(() => {
    connect({ connector: injected() });
    setShowWalletOptions(false);
  }, [connect]);

  const connectWalletConnect = useCallback(() => {
    connect({ 
      connector: walletConnect({ 
        projectId: 'efce48a19d0c7b8b8da21be2c1c8c271',
        showQrModal: true 
      }) 
    });
    setShowWalletOptions(false);
  }, [connect]);

  const connectCoinbase = useCallback(() => {
    connect({ 
      connector: coinbaseWallet({ 
        appName: 'MatrixFrog',
        appLogoUrl: 'https://matrixfrog.one/logo.png'
      }) 
    });
    setShowWalletOptions(false);
  }, [connect]);

  // Switch to correct network
  const switchNetwork = useCallback(async () => {
    if (!switchChain) return;

    try {
      await switchChain({ chainId: PEPU_TESTNET_ID });
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 4902) {
        // Chain not added, try to add it
        try {
          if (window.ethereum) {
            await (window.ethereum as any).request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${PEPU_TESTNET_ID.toString(16)}`,
                chainName: 'Pepu Testnet',
                nativeCurrency: {
                  name: 'PEPU',
                  symbol: 'PEPU',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'],
                blockExplorerUrls: ['https://explorer-pepu-v2-testnet-vn4qxxp9og.t.conduit.xyz'],
              }],
            });
          }
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  }, [switchChain]);

  // Submit transaction
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
      const walletClient = await getWalletClient();
      if (!walletClient) throw new Error('No wallet client');

      const hash = await walletClient.writeContract({
        ...args,
        account: address,
      });

      setNotification({ 
        message: "Transaction submitted! Waiting for confirmation...", 
        type: "info" 
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
  }, [address, getWalletClient, publicClient, readContractData]);

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

  // Effects
  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      readContractData();
      setupEventListeners();
      const interval = setInterval(readContractData, 10000); // Update every 10 seconds for dynamic data
      return () => {
        clearInterval(interval);
        if (eventCleanupRef.current) {
          eventCleanupRef.current();
        }
      };
    }
  }, [isConnected, isCorrectNetwork, readContractData, setupEventListeners]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventCleanupRef.current) {
        eventCleanupRef.current();
      }
    };
  }, []);

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
          
          {/* NEW: Emergency Status Display */}
          {(emergencyStatus.isPaused || !emergencyStatus.rewardsEnabled) && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              border: '2px solid #dc2626',
              borderRadius: '6px',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              {emergencyStatus.isPaused ? <Pause size={20} /> : <AlertTriangle size={20} />}
              <span className="text-red-400 font-bold">
                {emergencyStatus.isPaused 
                  ? "EMERGENCY PAUSED - Staking disabled, you can still unstake"
                  : "REWARDS STOPPED - New rewards not being generated"
                }
              </span>
            </div>
          )}
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
                <MatrixButton onClick={() => setShowWalletOptions(true)}>
                  Connect Wallet
                </MatrixButton>
              ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <MatrixButton onClick={connectMetaMask}>
                    MetaMask
                  </MatrixButton>
                  <MatrixButton onClick={connectWalletConnect}>
                    WalletConnect
                  </MatrixButton>
                  <MatrixButton onClick={connectCoinbase}>
                    Coinbase Wallet
                  </MatrixButton>
                  <MatrixButton onClick={() => setShowWalletOptions(false)} variant="cancel">
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
              <p style={{ textAlign: 'center' }}>Please switch to Pepu Testnet</p>
              <MatrixButton onClick={switchNetwork} variant="warning">
                Switch to Pepu Testnet
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
                <span className="text-2xl font-bold text-white">
                  {formatDisplayNumber(formatUnits(balance, 18))} MFG
                </span>
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
                      onChange={(e) => setStakeAmount(e.target.value)} 
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
                      disabled={isLoading || emergencyStatus.isPaused}
                    />
                    <MatrixButton 
                      onClick={handleMaxClick} 
                      disabled={isLoading || balance === 0n || emergencyStatus.isPaused}
                      variant="secondary"
                      className="!w-auto px-6"
                    >
                      MAX
                    </MatrixButton>
                  </div>
                  
                  {emergencyStatus.isPaused ? (
                    <div style={{
                      padding: '16px',
                      border: '1px solid #dc2626',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(220, 38, 38, 0.1)',
                      textAlign: 'center'
                    }}>
                      <span className="text-red-400">Staking is currently disabled due to emergency pause</span>
                    </div>
                  ) : needsApproval ? (
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
                        {formatDisplayNumber(formatUnits(userStakedAmount, 18))}
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
                  backgroundColor: 'rgba(147, 51, 234, 0.1)'
                }}>
                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                      <h3 className="text-lg font-bold text-purple-400">PTX Rewards</h3>
                      {!emergencyStatus.rewardsEnabled && <AlertTriangle size={16} className="text-yellow-400" />}
                    </div>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="text-3xl font-bold text-white">
                        {formatDisplayNumber(formatUnits(pendingRewards, 18))}
                      </div>
                      <div className="text-sm text-gray-400">
                        PTX Earned {!emergencyStatus.rewardsEnabled && "(rewards stopped)"}
                      </div>
                    </div>
                    <MatrixButton 
                      onClick={handleClaim} 
                      disabled={isLoading || pendingRewards === 0n}
                    >
                      {isLoading ? "Processing..." : "Claim PTX"}
                    </MatrixButton>
                  </div>
                </div>
              </div>

              {/* Notification */}
              {notification && (
                <div style={{
                  padding: '24px',
                  borderRadius: '8px',
                  border: 
                    notification.type === "error" ? '2px solid #ef4444' : 
                    notification.type === "success" ? '2px solid #22c55e' :
                    '2px solid #3b82f6',
                  backgroundColor: 
                    notification.type === "error" ? 'rgba(239, 68, 68, 0.1)' : 
                    notification.type === "success" ? 'rgba(34, 197, 94, 0.1)' :
                    'rgba(59, 130, 246, 0.1)',
                  color: 
                    notification.type === "error" ? '#fca5a5' : 
                    notification.type === "success" ? '#bbf7d0' :
                    '#93c5fd'
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
