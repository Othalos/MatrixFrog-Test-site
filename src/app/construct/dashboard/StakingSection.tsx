"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useAccount, useReadContract, useWriteContract, useChainId, useSwitchChain } from "wagmi";
import { formatUnits, parseUnits, maxUint256, type Abi } from "viem";
import { Info, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";

// --- CONFIGURATION ---
const PEPU_TESTNET_ID = 97740;
const STAKING_CONTRACT_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827";
const MFG_TOKEN_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889";
const POOL_ID = 0n;

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
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const isCorrectNetwork = chainId === PEPU_TESTNET_ID;

  const sharedReadConfig = { query: { enabled: isConnected && isCorrectNetwork && !!address } };
  const { data: mfgBalanceData, refetch: refetchMfgBalance } = useReadContract({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: address ? [address] : undefined, ...sharedReadConfig });
  const { data: userStakeData, refetch: refetchUserStake } = useReadContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "stakes", args: address ? [POOL_ID, address] : undefined, ...sharedReadConfig });
  const { data: pendingRewardsData, refetch: refetchPendingRewards } = useReadContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pendingRewards", args: address ? [POOL_ID, address] : undefined, ...sharedReadConfig });
  const { data: poolData, refetch: refetchPoolData } = useReadContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pools", args: [POOL_ID], query: { enabled: isConnected && isCorrectNetwork } });
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: address ? [address, STAKING_CONTRACT_ADDRESS] : undefined, ...sharedReadConfig });

  const { writeContract, isPending } = useWriteContract();

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setNotification({ message: 'Refreshing on-chain data...', type: 'success' });
    await Promise.all([
      refetchMfgBalance(),
      refetchUserStake(),
      refetchPendingRewards(),
      refetchAllowance(),
      refetchPoolData(),
    ]);
    setTimeout(() => {
      setIsRefreshing(false);
      setNotification(null);
    }, 1000);
  }, [isRefreshing, refetchMfgBalance, refetchUserStake, refetchPendingRewards, refetchAllowance, refetchPoolData]);

  const submitTransaction = (args: any) => {
    writeContract(args, {
      onSuccess: () => {
        setNotification({ message: 'Transaction sent! Wait a moment, then click Refresh.', type: 'success' });
      },
      onError: (error) => {
        const msg = error.message.includes('User rejected') ? 'Transaction rejected.' : 'Transaction failed.';
        setNotification({ message: msg, type: 'error' });
      },
    });
  };

  const mfgBalance = formatUnits(typeof mfgBalanceData === 'bigint' ? mfgBalanceData : 0n, 18);
  const userStakedAmount = formatUnits(userStakeData?.[0] ?? 0n, 18);
  const pendingRewards = formatUnits(typeof pendingRewardsData === 'bigint' ? pendingRewardsData : 0n, 18);
  const totalStaked = formatUnits(poolData?.[5] ?? 0n, 18);
  const allowance = formatUnits(typeof allowanceData === 'bigint' ? allowanceData : 0n, 18);
  
  const needsApproval = parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) > parseFloat(allowance);
  const hasStaked = parseFloat(userStakedAmount) > 0;

  const handleApprove = () => submitTransaction({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [STAKING_CONTRACT_ADDRESS, maxUint256] });
  const handleUnstake = () => submitTransaction({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'unstake', args: [POOL_ID] });
  const handleClaim = () => submitTransaction({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'claimRewards', args: [POOL_ID] });
  const handleStake = () => {
    if (parseFloat(stakeAmount) > parseFloat(mfgBalance)) { return setNotification({ message: 'Insufficient MFG balance.', type: 'error' }); }
    submitTransaction({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [POOL_ID, parseUnits(stakeAmount, 18)] });
  };

  return (
    <Card className="bg-black border border-green-700/50 text-green-300 font-mono">
      <CardHeader className="text-center">
        <CardTitle className="text-green-400 text-glow">Stake MFG to receive PTX at 25% APR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {!isConnected ? (
          <div className="p-4 rounded-md bg-black border border-green-700 flex flex-col items-center space-y-4">
              <h3 className="text-lg font-bold text-green-400 text-glow">ACCESS DENIED :: CONNECT WALLET</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                  <Button onClick={connectMetaMask} disabled={isConnecting} className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse">{isConnecting ? "Connecting..." : "MetaMask"}</Button>
                  <Button onClick={connectWalletConnect} disabled={isConnecting} className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse">{isConnecting ? "Connecting..." : "WalletConnect"}</Button>
                  <Button onClick={connectCoinbase} disabled={isConnecting} className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:bg-green-800/60 hover:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse">{isConnecting ? "Connecting..." : "Coinbase"}</Button>
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
            <div className="flex justify-end mb-4">
              <button onClick={handleRefresh} disabled={isRefreshing || isPending} className="flex items-center gap-2 px-3 py-1 text-xs border border-green-700 rounded-md hover:bg-green-900/50 disabled:cursor-wait disabled:text-gray-500 disabled:border-gray-700">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
            
            {!hasStaked ? (
              <div className="border border-green-700/50 rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center mb-1"><label className="text-sm">Your MFG Balance</label><span className="text-xs text-gray-400">{formatNumber(mfgBalance)} MFG</span></div>
                <div>
                  <div className="flex justify-between items-center mb-1"><label className="text-sm">Amount to Stake</label></div>
                  <div className="flex items-center">
                    <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(e.target.value)} placeholder="0.0" className="w-full bg-black border border-green-700/50 p-2 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 h-full" />
                    <button onClick={() => setStakeAmount(mfgBalance)} className="bg-green-900/50 border border-green-700 text-green-400 p-2 rounded-r-md hover:bg-green-800/50 h-full px-4 font-bold">MAX</button>
                  </div>
                </div>
                <button onClick={needsApproval ? handleApprove : handleStake} disabled={isPending || (!needsApproval && (parseFloat(stakeAmount) <= 0 || !stakeAmount))} className="w-full px-4 py-3 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:enabled:bg-green-800/60 hover:enabled:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse">
                  {isPending ? 'Check Wallet...' : (needsApproval ? 'Approve MFG' : 'Stake MFG')}
                </button>
                {needsApproval && (<div className="flex items-center text-xs text-yellow-400 space-x-2"><Info size={16}/><span>Approval required before staking.</span></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-green-700/50 rounded-md p-4 space-y-3 text-center flex flex-col justify-between">
                  <div>
                    <p className="text-sm">Your Staked MFG</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(userStakedAmount)}</p>
                  </div>
                  <button onClick={handleUnstake} disabled={isPending} className="w-full px-4 py-2 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-red-500 bg-red-900/50 text-red-300 hover:enabled:bg-red-800/60 hover:enabled:shadow-[0_0_15px_rgba(239,68,68,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse">
                    {isPending ? 'Check Wallet...' : 'Unstake All & Claim'}
                  </button>
                </div>
                <div className="border border-green-700/50 rounded-md p-4 space-y-3 text-center flex flex-col justify-between">
                  <div>
                    <p className="text-sm">Your PTX Rewards</p>
                    <p className="text-2xl font-bold text-white">{formatNumber(pendingRewards, 6)}</p>
                  </div>
                   <button disabled={isPending || parseFloat(pendingRewards) <= 0} onClick={handleClaim} className="w-full px-4 py-2 font-bold rounded-md transition-all duration-300 ease-in-out border text-lg border-green-500 bg-green-900/50 text-green-300 hover:enabled:bg-green-800/60 hover:enabled:shadow-[0_0_15px_rgba(74,222,128,0.7)] disabled:bg-black disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none disabled:animate-pulse">
                    {isPending ? 'Check Wallet...' : `Claim Rewards`}
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4 text-center pt-4">
              <div className="p-3 border border-green-700/50 rounded-md"><div className="text-sm">Total MFG Staked in Pool</div><div className="text-xl font-bold text-white">{formatNumber(totalStaked)}</div></div>
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
