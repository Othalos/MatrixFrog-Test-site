/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

"use client";

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

// --- Pool ---
const POOL_ID = 0;

// --- Contract Addresses ---
const MFG_TEST_ADDRESS = "0xa4Cb0c35CaD40e7ae12d0a01D4f489D6574Cc889";
const STAKING_TEST_ADDRESS = "0x33272A9aad7E7f89CeEE14659b04c183f382b827";
const PTX_TEST_ADDRESS = "0x30aa9CB881E3cBf9018445995C605A668d2Cd569";

const MFG_MAIN_ADDRESS = "0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5";
const PTX_MAIN_ADDRESS = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2";

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

  // --- Determine network ---
  const isSupportedNetwork =
    chainId === PEPU_TESTNET_ID || chainId === PEPU_MAINNET_ID;

  const MFG_TOKEN_ADDRESS: `0x${string}` =
    chainId === PEPU_MAINNET_ID ? (MFG_MAIN_ADDRESS as `0x${string}`) : (MFG_TEST_ADDRESS as `0x${string}`);

  const STAKING_CONTRACT_ADDRESS: `0x${string}` =
    chainId === PEPU_TESTNET_ID ? (STAKING_TEST_ADDRESS as `0x${string}`) : undefined!; // mainnet not deployed yet

  const PTX_TOKEN_ADDRESS: `0x${string}` =
    chainId === PEPU_MAINNET_ID ? (PTX_MAIN_ADDRESS as `0x${string}`) : (PTX_TEST_ADDRESS as `0x${string}`);

  // --- Contract reads ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, STAKING_CONTRACT_ADDRESS],
    query: { enabled: isConnected && isSupportedNetwork && !!address && !!STAKING_CONTRACT_ADDRESS },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: isConnected && isSupportedNetwork && !!address && !!STAKING_CONTRACT_ADDRESS },
  });

  const { data: stakedData, refetch: refetchStaked } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "userInfo",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isSupportedNetwork && !!address && !!STAKING_CONTRACT_ADDRESS },
  });

  const { data: pendingRewardsData, refetch: refetchRewards } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "pendingRewards",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isSupportedNetwork && !!address && !!STAKING_CONTRACT_ADDRESS },
  });

  // --- Derived values ---
  const allowance: bigint = (allowanceData as bigint) ?? 0n;
  const stakeAmountBN: bigint = stakeAmount ? parseUnits(stakeAmount, 18) : 0n;
  const needsApproval = stakeAmountBN > allowance;

  const balance = balanceData ? formatUnits(balanceData as bigint, 18) : "0";
  const staked = stakedData ? formatUnits((stakedData as any)[0], 18) : "0";
  const rewards = pendingRewardsData
    ? formatUnits(pendingRewardsData as bigint, 18)
    : "0";

  // --- Actions ---
  const handleApprove = () => {
    writeContract({
      address: MFG_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [STAKING_CONTRACT_ADDRESS, maxUint256],
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
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [POOL_ID, stakeAmountBN],
    });
    setStakeAmount("");
  };

  const handleUnstake = () => {
    writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: "unstake",
      args: [POOL_ID, stakedData ? (stakedData as any)[0] : 0n],
    });
  };

  const handleClaim = () => {
    writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: "claimRewards",
      args: [POOL_ID],
    });
  };

  // --- Refetch on tx success ---
  useEffect(() => {
    if (txConfirmed) {
      Promise.all([refetchAllowance(), refetchBalance(), refetchStaked(), refetchRewards()]);
    }
  }, [txConfirmed]);

  // --- UI ---
  if (!isConnected) {
    return <p>Please connect your wallet.</p>;
  }
  if (!isSupportedNetwork) {
    return (
      <p>
        Please switch to <b>PepU Testnet (97740) or Mainnet (97741)</b> to use staking.
      </p>
    );
  }
  if (chainId === PEPU_MAINNET_ID && !STAKING_CONTRACT_ADDRESS) {
    return <p>Staking contract not deployed on Mainnet yet.</p>;
  }

  return (
    <div className="p-4 border rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Staking</h2>

      <div className="flex justify-between">
        <div>
          <p>MFG Staked: {staked}</p>
          <button
            onClick={handleUnstake}
            className="bg-red-600 text-white px-4 py-2 rounded-xl mt-2"
          >
            Unstake All
          </button>
        </div>
        <div>
          <p>Pending PTX: {rewards}</p>
          <button
            onClick={handleClaim}
            className="bg-yellow-600 text-black px-4 py-2 rounded-xl mt-2"
          >
            Claim PTX
          </button>
        </div>
      </div>

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
