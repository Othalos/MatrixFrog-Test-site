// StakingSection.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { Info } from "lucide-react";

// ABI for the Staking Contract
const STAKING_ABI = [
  {"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[],"name":"BASIS_POINTS_DIVISOR","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],"name":"pendingRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"pools","outputs":[{"internalType":"contract IERC20","name":"stakingToken","type":"address"},{"internalType":"contract IERC20","name":"rewardToken","type":"address"},{"internalType":"uint256","name":"apyBasisPoints","type":"uint256"},{"internalType":"uint256","name":"lockDuration","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"totalStaked","type":"uint256"},{"internalType":"uint256","name":"rewardBudget","type":"uint256"},{"internalType":"bool","name":"rewardsExhausted","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"unstake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"}],"name":"claimRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"poolId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"stake","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"address","name":"","type":"address"}],"name":"stakes","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"unclaimed","type":"uint256"}],"stateMutability":"view","type":"function"}
];

// ABI for ERC20 Tokens
const ERC20_ABI = [
  {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
  {"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
  {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}
];

// Contract and Token Addresses
const STAKING_CONTRACT_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827";
const MFG_TOKEN_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889";
const PTX_TOKEN_ADDRESS = "0x30aa9CB881E3cBf90184445995C605A668d2Cd569";

const POOL_ID = 0;

const formatNumber = (value: string | number, decimals: number = 2) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export default function StakingSection() {
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState("stake");
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { address, isConnected } = useAccount();

  const { writeContract, data: hash, isPending: isTxPending } = useWriteContract({
    mutation: {
      onSuccess: () => setNotification({ message: 'Transaction submitted!', type: 'success' }),
      onError: (error) => {
        const msg = error.message.includes('User rejected') ? 'Transaction rejected.' : 'Transaction failed.';
        setNotification({ message: msg, type: 'error' });
      }
    }
  });

  const { data: mfgBalanceData, refetch: refetchMfgBalance } = useReadContract({
    address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, enabled: isConnected,
  });

  const { data: userStakeData, refetch: refetchUserStake } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "stakes",
    args: [POOL_ID, address], enabled: isConnected,
  });

  const { data: pendingRewardsData, refetch: refetchPendingRewards } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pendingRewards",
    args: [POOL_ID, address], enabled: isConnected,
  });

  const { data: poolData } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: "pools",
    args: [POOL_ID],
  });

  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "allowance",
    args: address ? [address, STAKING_CONTRACT_ADDRESS] : undefined, enabled: isConnected,
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      setNotification({ message: 'Transaction confirmed!', type: 'success' });
      refetchMfgBalance();
      refetchUserStake();
      refetchPendingRewards();
      refetchAllowance();
      setTimeout(() => setNotification(null), 5000);
    }
  }, [isConfirmed, refetchMfgBalance, refetchUserStake, refetchPendingRewards, refetchAllowance]);

  const mfgBalance = mfgBalanceData ? formatUnits(mfgBalanceData as bigint, 18) : "0";
  const userStakedAmount = userStakeData ? formatUnits((userStakeData as any).amount, 18) : "0";
  const pendingRewards = pendingRewardsData ? formatUnits(pendingRewardsData as bigint, 18) : "0";
  const totalStaked = poolData ? formatUnits((poolData as any).totalStaked, 18) : "0";
  const allowance = allowanceData ? formatUnits(allowanceData as bigint, 18) : "0";
  
  const needsApproval = parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) > parseFloat(allowance);

  const handleApprove = () => {
    if (!isConnected) return;
    writeContract({ address: MFG_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'approve', args: [STAKING_CONTRACT_ADDRESS, maxUint256] });
  };

  const handleStake = () => {
    if (!isConnected || !stakeAmount || parseFloat(stakeAmount) <= 0) return;
    if (parseFloat(stakeAmount) > parseFloat(mfgBalance)) {
      setNotification({ message: 'Insufficient MFG balance.', type: 'error' });
      return;
    }
    writeContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'stake', args: [POOL_ID, parseUnits(stakeAmount, 18)] });
    setStakeAmount("");
  };

  const handleUnstake = () => {
    if (!isConnected || parseFloat(userStakedAmount) <= 0) return;
    writeContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'unstake', args: [POOL_ID] });
  };

  const handleClaim = () => {
    if (!isConnected || parseFloat(pendingRewards) <= 0) return;
    writeContract({ address: STAKING_CONTRACT_ADDRESS, abi: STAKING_ABI, functionName: 'claimRewards', args: [POOL_ID] });
  };

  const isLoading = isTxPending || isConfirming;
  const isStakeButtonDisabled = isLoading || (!needsApproval && (parseFloat(stakeAmount) <= 0 || !stakeAmount));

  return (
    <Card style={{ backgroundColor: "black", border: "1px solid rgba(34,197,94,0.3)" }}>
      <CardHeader>
        <CardTitle style={{ color: "#4ade80", textShadow: "0 0 5px rgba(74, 222, 128, 0.5)" }}>
          STAKING TERMINAL :: MFG > PTX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 border border-green-700/50 rounded-md">
            <div className="text-sm text-green-400">APR</div>
            <div className="text-xl font-bold text-white">25.00%</div>
          </div>
          <div className="p-3 border border-green-700/50 rounded-md">
            <div className="text-sm text-green-400">Total MFG Staked</div>
            <div className="text-xl font-bold text-white">{formatNumber(totalStaked)}</div>
          </div>
          <div className="p-3 border border-green-700/50 rounded-md">
            <div className="text-sm text-green-400">Your Staked MFG</div>
            <div className="text-xl font-bold text-white">{formatNumber(userStakedAmount)}</div>
          </div>
          <div className="p-3 border border-green-700/50 rounded-md">
            <div className="text-sm text-green-400">PTX Rewards</div>
            <div className="text-xl font-bold text-white">{formatNumber(pendingRewards, 6)}</div>
          </div>
        </div>

        {/* Claim Rewards Section */}
        <div className="text-center">
          <button
            onClick={handleClaim}
            disabled={isLoading || parseFloat(pendingRewards) <= 0}
            className="w-full md:w-1/2 px-4 py-2 bg-green-600 text-black font-bold rounded-md hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : `Claim ${formatNumber(pendingRewards, 6)} PTX`}
          </button>
        </div>

        {/* Staking/Unstaking Interface */}
        <div className="border border-green-700/50 rounded-md p-4">
          <div className="flex border-b border-green-700/50 mb-4">
            <button onClick={() => setActiveTab('stake')} className={`flex-1 py-2 ${activeTab === 'stake' ? 'bg-green-900/50 text-white' : 'text-gray-400'}`}>Stake MFG</button>
            <button onClick={() => setActiveTab('unstake')} className={`flex-1 py-2 ${activeTab === 'unstake' ? 'bg-green-900/50 text-white' : 'text-gray-400'}`}>Unstake</button>
          </div>

          {activeTab === 'stake' ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-green-400">Amount to Stake</label>
                  <span className="text-xs text-gray-400">Balance: {formatNumber(mfgBalance)} MFG</span>
                </div>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-black border border-green-700/50 p-2 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button onClick={() => setStakeAmount(mfgBalance)} className="bg-green-800 text-white p-2 rounded-r-md hover:bg-green-700">MAX</button>
                </div>
              </div>
              <button
                onClick={needsApproval ? handleApprove : handleStake}
                disabled={isStakeButtonDisabled}
                className="w-full px-4 py-2 bg-green-600 text-black font-bold rounded-md hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : (needsApproval ? 'Approve MFG' : 'Stake MFG')}
              </button>
              {needsApproval && (
                <div className="flex items-center text-xs text-yellow-400 space-x-2">
                  <Info size={16}/>
                  <span>Approval required before staking. This is a one-time transaction (or until revoked).</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-lg text-white">
                <p className="text-sm text-green-400">Available to Unstake</p>
                <p className="text-2xl font-bold">{formatNumber(userStakedAmount)} MFG</p>
              </div>
              <button
                onClick={handleUnstake}
                disabled={isLoading || parseFloat(userStakedAmount) <= 0}
                className="w-full px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Processing...' : 'Unstake All MFG'}
              </button>
            </div>
          )}
        </div>

        {/* Notification Area */}
        {notification && (
          <div className={`p-3 rounded-md text-center text-sm ${notification.type === 'success' ? 'bg-green-900/80 text-green-300' : 'bg-red-900/80 text-red-300'}`}>
            {notification.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
