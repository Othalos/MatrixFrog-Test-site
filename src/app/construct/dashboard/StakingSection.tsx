"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  injected,
  walletConnect,
  coinbaseWallet,
} from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";

// --- Chain IDs ---
const PEPU_MAINNET_ID = 97741;
const PEPU_TESTNET_ID = 97740;

// --- Contract addresses ---
const MFG_TEST_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889";
const PTX_TEST_ADDRESS = "0x30aa9CB881E3cBf9018445995C605A668d2Cd569";
const STAKING_TEST_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827";

const MFG_MAIN_ADDRESS = "0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5";
const PTX_MAIN_ADDRESS = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2";

// --- ABI imports ---
import ERC20_ABI from "@abis/ERC20.json";
import STAKING_ABI from "@abis/Staking.json";

// --- Pool ID ---
const POOL_ID = 0;

// --- Types ---
type UserInfo = [bigint, bigint]; // [amountStaked, rewardDebt]

export default function StakingSection() {
  const { address, isConnected, chain } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // --- Determine network ---
  const isTestnet = chain?.id === PEPU_TESTNET_ID;
  const isMainnet = chain?.id === PEPU_MAINNET_ID;
  const isCorrectNetwork = isTestnet || isMainnet;

  // --- Set addresses dynamically ---
  const MFG_ADDRESS = isTestnet ? MFG_TEST_ADDRESS : MFG_MAIN_ADDRESS;
  const PTX_ADDRESS = isTestnet ? PTX_TEST_ADDRESS : PTX_MAIN_ADDRESS;
  const STAKING_ADDRESS = isTestnet ? STAKING_TEST_ADDRESS : undefined;

  // --- Read allowance, balance, staked, rewards ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract<bigint>({
    address: MFG_ADDRESS!,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, STAKING_ADDRESS!],
    query: { enabled: isConnected && isCorrectNetwork && !!address && !!STAKING_ADDRESS },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract<bigint>({
    address: MFG_ADDRESS!,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: isConnected && isCorrectNetwork && !!address },
  });

  const { data: stakedData, refetch: refetchStaked } = useReadContract<UserInfo>({
    address: STAKING_ADDRESS!,
    abi: STAKING_ABI,
    functionName: "userInfo",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isCorrectNetwork && !!address && !!STAKING_ADDRESS },
  });

  const { data: pendingRewardsData, refetch: refetchRewards } = useReadContract<bigint>({
    address: STAKING_ADDRESS!,
    abi: STAKING_ABI,
    functionName: "pendingRewards",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isCorrectNetwork && !!address && !!STAKING_ADDRESS },
  });

  // --- Write contract ---
  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // --- Derived values ---
  const allowance: bigint = allowanceData ?? 0n;
  const stakeAmountBN: bigint = stakeAmount ? parseUnits(stakeAmount, 18) : 0n;
  const needsApproval = stakeAmountBN > allowance;

  const balance = balanceData ? formatUnits(balanceData, 18) : "0";
  const staked = stakedData ? formatUnits(stakedData[0], 18) : "0";
  const rewards = pendingRewardsData ? formatUnits(pendingRewardsData, 18) : "0";

  // --- Actions ---
  const handleApprove = () => {
    writeContract({
      address: MFG_ADDRESS!,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [STAKING_ADDRESS!, maxUint256],
    });
    setTimeout(() => refetchAllowance(), 5000);
  };

  const handleStake = () => {
    if (parseFloat(stakeAmount) > parseFloat(balance)) {
      return setNotification({ message: "Insufficient MFG balance.", type: "error" });
    }
    writeContract({
      address: STAKING_ADDRESS!,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [POOL_ID, stakeAmountBN],
    });
    setStakeAmount("");
  };

  const handleUnstake = () => {
    const stakedAmount = stakedData ? stakedData[0] : 0n;
    if (stakedAmount === 0n) return;
    writeContract({
      address: STAKING_ADDRESS!,
      abi: STAKING_ABI,
      functionName: "unstake",
      args: [POOL_ID, stakedAmount],
    });
  };

  const handleClaim = () => {
    writeContract({
      address: STAKING_ADDRESS!,
      abi: STAKING_ABI,
      functionName: "claimRewards",
      args: [POOL_ID],
    });
  };

  // --- Refetch after transaction ---
  useEffect(() => {
    if (txConfirmed) {
      Promise.all([refetchAllowance(), refetchBalance(), refetchStaked(), refetchRewards()]);
    }
  }, [txConfirmed, refetchAllowance, refetchBalance, refetchStaked, refetchRewards]);

  // --- Wallet connections ---
  const connectMetaMask = async () => connect({ connector: injected() });
  const connectWalletConnect = async () => connect({ connector: walletConnect({ projectId: "YOUR_PROJECT_ID" }) });
  const connectCoinbase = async () => connect({ connector: coinbaseWallet() });

  // --- UI ---
  if (!isConnected) {
    return (
      <div>
        <p>Please connect your wallet:</p>
        <button onClick={connectMetaMask}>MetaMask</button>
        <button onClick={connectWalletConnect}>WalletConnect</button>
        <button onClick={connectCoinbase}>Coinbase Wallet</button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return <p>Please switch to PepU Testnet or Mainnet to use staking.</p>;
  }

  return (
    <div className="p-4 border rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Staking</h2>
      <p>Balance: {balance} MFG | Staked: {staked} MFG | Rewards: {rewards} PTX</p>

      <input
        type="number"
        placeholder="Amount to stake"
        value={stakeAmount}
        onChange={(e) => setStakeAmount(e.target.value)}
        className="border p-2 rounded w-full"
      />

      {needsApproval ? (
        <button onClick={handleApprove} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
          Approve
        </button>
      ) : (
        <button onClick={handleStake} className="bg-green-600 text-white px-4 py-2 rounded-xl">
          Stake
        </button>
      )}

      <div className="flex space-x-4">
        <button onClick={handleUnstake} className="bg-red-600 text-white px-4 py-2 rounded-xl">
          Unstake All
        </button>
        <button onClick={handleClaim} className="bg-yellow-600 text-black px-4 py-2 rounded-xl">
          Claim PTX
        </button>
      </div>

      {notification && (
        <p className={`mt-2 ${notification.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {notification.message}
        </p>
      )}
    </div>
  );
}
