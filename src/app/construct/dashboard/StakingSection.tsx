"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";

// --- Chain IDs ---
const PEPU_MAINNET_ID = 97741;
const PEPU_TESTNET_ID = 97740;

// --- Contracts ---
const CONTRACTS = {
  [PEPU_MAINNET_ID]: {
    token: "0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5", // MFG Mainnet
    staking: "0xYourMainnetStakingContract", // 🔴 Replace once deployed
    rewards: "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2", // PTX Mainnet
  },
  [PEPU_TESTNET_ID]: {
    token: "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889", // MFG Testnet
    staking: "0x33272A9aad7E7f89CeEE14659b04c183f382b827", // Staking Testnet
    rewards: "0x30aa9CB881E3cBf9018445995C605A668d2Cd569", // PTX Testnet
  },
};

const POOL_ID = 0;

// --- ABIs ---
import ERC20_ABI from "@abis/ERC20.json";
import STAKING_ABI from "@abis/Staking.json";

export default function StakingSection() {
  const { address, chainId, isConnected } = useAccount();
  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // ✅ Check if connected network is supported
  const isSupportedNetwork =
    chainId === PEPU_MAINNET_ID || chainId === PEPU_TESTNET_ID;

  // ✅ Resolve contract addresses
  const MFG_TOKEN_ADDRESS = isSupportedNetwork
    ? CONTRACTS[chainId!].token
    : undefined;
  const STAKING_CONTRACT_ADDRESS = isSupportedNetwork
    ? CONTRACTS[chainId!].staking
    : undefined;

  // --- Reads ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, STAKING_CONTRACT_ADDRESS!],
    query: { enabled: isConnected && isSupportedNetwork && !!address },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: isConnected && isSupportedNetwork && !!address },
  });

  const { data: stakedData, refetch: refetchStaked } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "userInfo",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isSupportedNetwork && !!address },
  });

  const { data: pendingRewardsData, refetch: refetchRewards } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "pendingRewards",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isSupportedNetwork && !!address },
  });

  // --- Derived values ---
  const allowance: bigint = (allowanceData as bigint) ?? 0n;
  const stakeAmountBN: bigint = stakeAmount
    ? parseUnits(stakeAmount, 18)
    : 0n;
  const needsApproval = stakeAmountBN > allowance;

  const balance = balanceData ? formatUnits(balanceData as bigint, 18) : "0";
  const staked = stakedData ? formatUnits((stakedData as any)[0], 18) : "0";
  const rewards = pendingRewardsData
    ? formatUnits(pendingRewardsData as bigint, 18)
    : "0";

  // --- Actions ---
  const handleApprove = () => {
    writeContract({
      address: MFG_TOKEN_ADDRESS!,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [STAKING_CONTRACT_ADDRESS!, maxUint256],
    });
    setTimeout(() => refetchAllowance(), 5000);
  };

  const handleStake = () => {
    if (parseFloat(stakeAmount) > parseFloat(balance)) {
      return setNotification({
        message: "Insufficient MFG balance.",
        type: "error",
      });
    }
    writeContract({
      address: STAKING_CONTRACT_ADDRESS!,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [POOL_ID, stakeAmountBN],
    });
    setStakeAmount("");
  };

  const handleUnstake = () => {
    writeContract({
      address: STAKING_CONTRACT_ADDRESS!,
      abi: STAKING_ABI,
      functionName: "unstake",
      args: [POOL_ID, stakedData ? (stakedData as any)[0] : 0n],
    });
  };

  const handleClaim = () => {
    writeContract({
      address: STAKING_CONTRACT_ADDRESS!,
      abi: STAKING_ABI,
      functionName: "claimRewards",
      args: [POOL_ID],
    });
  };

  // --- Refetch on tx success ---
  useEffect(() => {
    if (txConfirmed) {
      Promise.all([
        refetchAllowance(),
        refetchBalance(),
        refetchStaked(),
        refetchRewards(),
      ]);
    }
  }, [txConfirmed]);

  // --- Auto refresh every 10s ---
  useEffect(() => {
    if (!isConnected || !isSupportedNetwork) return;

    const interval = setInterval(() => {
      refetchBalance();
      refetchStaked();
      refetchRewards();
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [isConnected, isSupportedNetwork]);

  // --- UI States ---
  if (!isConnected) return <p>Please connect your wallet.</p>;

  if (!isSupportedNetwork) {
    return (
      <p>
        Please switch to <b>PepU Mainnet (97741)</b> or{" "}
        <b>PepU Testnet (97740)</b> to use staking.
      </p>
    );
  }

  if (
    chainId === PEPU_MAINNET_ID &&
    CONTRACTS[PEPU_MAINNET_ID].staking.startsWith("0xYour")
  ) {
    return <p>Staking on PepU Mainnet is not live yet. Please try again later.</p>;
  }

  // --- Main UI ---
  return (
    <div className="p-6 border rounded-2xl shadow-lg space-y-6 bg-white">
      <h2 className="text-2xl font-bold text-center">MFG ↔ PTX Staking</h2>

      {/* Stake input */}
      <div className="space-y-2">
        <p>Wallet Balance: {balance} MFG</p>
        <input
          type="number"
          placeholder="Amount to stake"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          className="border p-2 rounded w-full"
        />

        {needsApproval ? (
          <button
            onClick={handleApprove}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl w-full"
          >
            Approve
          </button>
        ) : (
          <button
            onClick={handleStake}
            className="bg-green-600 text-white px-4 py-2 rounded-xl w-full"
          >
            Stake
          </button>
        )}
      </div>

      {/* Staked MFG Section */}
      <div className="p-4 border rounded-xl bg-gray-50 shadow-sm">
        <h3 className="text-lg font-semibold">Your Staked MFG</h3>
        <p className="text-xl font-mono">{staked} MFG</p>
        <button
          onClick={handleUnstake}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded-xl w-full"
        >
          Unstake All (MFG + PTX)
        </button>
      </div>

      {/* Rewards Section */}
      <div className="p-4 border rounded-xl bg-yellow-50 shadow-sm">
        <h3 className="text-lg font-semibold">Unclaimed Rewards</h3>
        <p className="text-xl font-mono">{rewards} PTX</p>
        <button
          onClick={handleClaim}
          className="mt-2 bg-yellow-600 text-black px-4 py-2 rounded-xl w-full"
        >
          Claim Rewards (PTX Only)
        </button>
      </div>

      {notification && (
        <p
          className={`mt-2 ${
            notification.type === "error" ? "text-red-600" : "text-green-600"
          }`}
        >
          {notification.message}
        </p>
      )}
    </div>
  );
}
