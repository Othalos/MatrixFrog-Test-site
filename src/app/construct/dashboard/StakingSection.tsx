"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from "wagmi";
import { formatUnits, parseUnits, maxUint256, type Hash, type Abi } from "viem";
import { Info, AlertTriangle } from "lucide-react";
import { Button } from "@/app/components/ui/button";

// --- CONFIGURATION ---
const PEPU_TESTNET_ID = 97740;
const STAKING_CONTRACT_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827";
const MFG_TOKEN_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889";
const POOL_ID = 0n;

// --- TYPE DEFINITIONS ---
type StakeInfo = { amount: bigint; timestamp: bigint; unclaimed: bigint; };
type PoolInfo = { totalStaked: bigint; /* other fields */ };
type WriteContractParameters = {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: unknown[];
};

// --- ABIs ---
const STAKING_ABI = [{"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"BASIS_POINTS_DIVISOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"pendingRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"pools","outputs":[{"internalType":"contract IERC20","name":"stakingToken","type":"address"},{"internalType":"contract IERC20","name":"rewardToken","type":"address"},{"internalType":"uint256","name":"apyBasisPoints","type":"uint256"},{"internalType":"uint256","name":"lockDuration","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"rewardBudget","type":"uint256"},{"internalType":"bool","name":"rewardsExhausted","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"unclaimed","type":"uint256"}],"stateMutability":"view","type":"function"}] as const;
const ERC20_ABI = [{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}] as const;

const formatNumber = (value: string | number, decimals: number = 2) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

interface StakingSectionProps {
  connectMetaMask: () => void;
  connectWalletConnect: () => void;
  connectCoinbase: () => void;
  isConnecting: boolean;
}

export default function StakingSection({ connectMetaMask, connectWalletConnect, connectCoinbase, isConnecting }: StakingSectionProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState("stake");
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isCorrectNetwork = chainId === PEPU_TESTNET_ID;

  // **THE FIX IS HERE**: Added '!!address' to ensure the hook only runs when the address is available
  const sharedReadConfig = { enabled: isConnected && isCorrectNetwork && !!address };

  const { data: mfgBalanceData, refetch: refetchMfgBalance } = useReadContract({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: address ? [address] : undefined, ...sharedReadConfig });
  const { data: userStakeData, refetch: refetchUserStake } = useReadContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "stakes", args: [POOL_ID, address], ...sharedReadConfig });
  const { data: pendingRewardsData, refetch: refetchPendingRewards } = useReadContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pendingRewards", args: [POOL_ID, address], ...sharedReadConfig });
  const { data: poolData, refetch: refetchPoolData } = useReadContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pools", args: [POOL_ID], ...sharedReadConfig });
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: address ? [address, STAKING_CONTRACT_ADDRESS] : undefined, ...sharedReadConfig });

  const refetchAllData = useCallback(() => {
    refetchMfgBalance();
    refetchUserStake();
    refetchPendingRewards();
    refetchAllowance();
    refetchPoolData();
  }, [refetchMfgBalance, refetchUserStake, refetchPendingRewards, refetchAllowance, refetchPoolData]);

  const { writeContract, isPending: isTxPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      setNotification({ message: 'Transaction confirmed!', type: 'success' });
      setTimeout(() => {
        refetchAllData();
        setNotification(null);
      }, 2000);
    }
  }, [isConfirmed, refetchAllData]);

  const submitTransaction = (args: WriteContractParameters, action: string) => {
    setLoadingAction(action);
    writeContract(args, {
      onSuccess: (hash) => {
        setTxHash(hash);
        setNotification({ message: 'Transaction submitted! Waiting for confirmation...', type: 'success' });
      },
      onError: (error) => {
        const msg = error.message.includes('User rejected') ? 'Transaction rejected.' : 'Transaction failed.';
        setNotification({ message: msg, type: 'error' });
        setLoadingAction(null);
      },
      onSettled: () => {
        setLoadingAction(null);
      }
    });
  };
  
  const mfgBalance = formatUnits(typeof mfgBalanceData === 'bigint' ? mfgBalanceData : 0n, 18);
  const userStakedAmount = formatUnits((userStakeData as StakeInfo)?.amount ?? 0n, 18);
  const pendingRewards = formatUnits(typeof pendingRewardsData === 'bigint' ? pendingRewardsData : 0n, 18);
  const totalStaked = formatUnits((poolData as PoolInfo)?.totalStaked ?? 0n, 18);
  const allowance = formatUnits(typeof allowanceData === 'bigint' ? allowanceData : 0n, 18);
  
  const needsApproval = parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) > parseFloat(allowance);
  const isLoading = isTxPending || isConfirming;

  const handleApprove = () => submitTransaction({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [STAKING_CONTRACT_ADDRESS, maxUint256] }, 'approve');
  const handleUnstake = () => submitTransaction({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'unstake', args: [POOL_ID] }, 'unstake');
  const handleClaim = () => submitTransaction({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'claimRewards', args: [POOL_ID] }, 'claim');
  const handleStake = () => {
    if (parseFloat(stakeAmount) > parseFloat(mfgBalance)) { return setNotification({ message: 'Insufficient MFG balance.', type: 'error' }); }
    submitTransaction({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [POOL_ID, parseUnits(stakeAmount, 18)] }, 'stake');
    setStakeAmount("");
  };

  return (
    <Card className="bg-black border border-green-700/50 text-green-300 font-mono">
      <CardHeader>
        <CardTitle className="text-green-400 text-glow">STAKING TERMINAL :: MFG {'>'} PTX (Testnet)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {!isConnected ? (
          <div className="p-4 rounded-md bg-black border border-green-700 flex flex-col items-center space-y-4">
              <h3 className="text-lg font-bold text-green-400 text-glow">ACCESS DENIED :: CONNECT WALLET</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                  <Button onClick={connectMetaMask} disabled={isConnecting} className="matrix-button-green">{isConnecting ? "Connecting..." : "MetaMask"}</Button>
                  <Button onClick={connectWalletConnect} disabled={isConnecting} className="matrix-button-green">{isConnecting ? "Connecting..." : "WalletConnect"}</Button>
                  <Button onClick={connectCoinbase} disabled={isConnecting} className="matrix-button-green">{isConnecting ? "Connecting..." : "Coinbase"}</Button>
              </div>
          </div>
        ) : !isCorrectNetwork ? (
          <div className="p-4 rounded-md bg-yellow-900/80 text-yellow-300 border border-yellow-700 flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2"><AlertTriangle size={20}/><span className="font-bold">WRONG NETWORK</span></div>
            <p className="text-sm text-center">Switch to the Pepu Testnet to use staking features.</p>
            <button onClick={() => switchChain({ chainId: PEPU_TESTNET_ID })} className="px-4 py-2 bg-yellow-600 text-black font-bold rounded-md hover:bg-yellow-500">Switch Network</button>
          </div>
        ) : (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="matrix-stat-box"><div className="text-sm">APR</div><div className="text-xl font-bold text-white">25.00%</div></div>
              <div className="matrix-stat-box"><div className="text-sm">Total Staked</div><div className="text-xl font-bold text-white">{formatNumber(totalStaked)}</div></div>
              <div className="matrix-stat-box"><div className="text-sm">Your Stake</div><div className="text-xl font-bold text-white">{formatNumber(userStakedAmount)}</div></div>
              <div className="matrix-stat-box"><div className="text-sm">PTX Rewards</div><div className="text-xl font-bold text-white">{formatNumber(pendingRewards, 6)}</div></div>
            </div>
            <div className="text-center">
              <button onClick={handleClaim} disabled={isLoading || parseFloat(pendingRewards) <= 0} className={`matrix-button-green ${isLoading || parseFloat(pendingRewards) <= 0 ? 'disabled' : ''}`}>
                {loadingAction === 'claim' ? 'Processing...' : `Claim Rewards`}
              </button>
            </div>
            <div className="border border-green-700/50 rounded-md p-4">
              <div className="flex border-b border-green-700/50 mb-4">
                <button onClick={() => setActiveTab('stake')} className={`flex-1 py-2 text-sm font-bold ${activeTab === 'stake' ? 'bg-green-900/50 text-white text-glow-sm' : 'text-gray-400'}`}>Stake MFG</button>
                <button onClick={() => setActiveTab('unstake')} className={`flex-1 py-2 text-sm font-bold ${activeTab === 'unstake' ? 'bg-green-900/50 text-white text-glow-sm' : 'text-gray-400'}`}>Unstake</button>
              </div>
              {activeTab === 'stake' ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1"><label className="text-sm">Amount to Stake</label><span className="text-xs text-gray-400">Balance: {formatNumber(mfgBalance)} MFG</span></div>
                    <div className="flex items-center">
                      <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="0.0" className="w-full bg-black border border-green-700/50 p-2 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <button onClick={() => setStakeAmount(mfgBalance)} className="bg-green-900/50 border border-green-700 text-green-400 p-2 rounded-r-md hover:bg-green-800/50 h-full px-4">MAX</button>
                    </div>
                  </div>
                  <button onClick={needsApproval ? handleApprove : handleStake} disabled={isLoading || (!needsApproval && (parseFloat(stakeAmount) <= 0 || !stakeAmount))} className={`matrix-button-green ${isLoading || (!needsApproval && (parseFloat(stakeAmount) <= 0 || !stakeAmount)) ? 'disabled' : ''}`}>
                    {loadingAction === 'approve' || loadingAction === 'stake' ? 'Processing...' : (needsApproval ? 'Approve MFG' : 'Stake MFG')}
                  </button>
                  {needsApproval && (<div className="flex items-center text-xs text-yellow-400 space-x-2"><Info size={16}/><span>Approval required before staking.</span></div>)}
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="text-lg text-white"><p className="text-sm">Available to Unstake</p><p className="text-2xl font-bold">{formatNumber(userStakedAmount)} MFG</p></div>
                  <button onClick={handleUnstake} disabled={isLoading || parseFloat(userStakedAmount) <= 0} className={`matrix-button-red ${isLoading || parseFloat(userStakedAmount) <= 0 ? 'disabled' : ''}`}>
                    {loadingAction === 'unstake' ? 'Processing...' : 'Unstake All MFG'}
                  </button>
                </div>
              )}
            </div>
        </>
        )}
        {notification && (
          <div className={`p-3 rounded-md text-center text-sm ${notification.type === 'success' ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>
            {notification.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
