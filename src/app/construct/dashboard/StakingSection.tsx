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

// --- Contracts ---
const MFG_TOKEN_ADDRESS = "0xYourMFGToken"; // replace with your deployed MFG address
const STAKING_CONTRACT_ADDRESS = "0xYourStakingContract"; // replace with deployed staking contract
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
  const [notification, setNotification] = useState<
    { message: string; type: "success" | "error" } | null
  >(null);

  // ✅ Only allow staking on PepU Testnet (97740)
  const isCorrectNetwork = chainId === PEPU_TESTNET_ID;

  // --- Contract reads ---
  const {
    data: allowanceData,
    refetch: refetchAllowance,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, STAKING_CONTRACT_ADDRESS],
    query: { enabled: isConnected && isCorrectNetwork && !!address },
  });

  const {
    data: balanceData,
    refetch: refetchBalance,
  } = useReadContract({
    address: MFG_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: isConnected && isCorrectNetwork && !!address },
  });

  const {
    data: stakedData,
    refetch: refetchStaked,
  } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "userInfo",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isCorrectNetwork && !!address },
  });

  const {
    data: pendingRewardsData,
    refetch: refetchRewards,
  } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_ABI,
    functionName: "pendingRewards",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && isCorrectNetwork && !!address },
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
    console.log("Approving max allowance...");
    writeContract({
      address: MFG_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [STAKING_CONTRACT_ADDRESS, maxUint256],
    });

    // force refetch shortly after approve tx
    setTimeout(() => refetchAllowance(), 5000);
  };

  const handleStake = () => {
    console.log("Staking", stakeAmountBN.toString(), "wei");
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
    console.log("Unstaking all...");
    writeContract({
      address: STAKING_CONTRACT_ADDRESS,
      abi: STAKING_ABI,
      functionName: "unstake",
      args: [POOL_ID, stakedData ? (stakedData as any)[0] : 0n],
    });
  };

  const handleClaim = () => {
    console.log("Claiming rewards...");
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
      Promise.all([
        refetchAllowance(),
        refetchBalance(),
        refetchStaked(),
        refetchRewards(),
      ]);
    }
  }, [txConfirmed]);

  // --- UI ---
  if (!isConnected) {
    return <p>Please connect your wallet.</p>;
  }
  if (!isCorrectNetwork) {
    return (
      <p>
        Please switch to <b>PepU Testnet (Chain ID 97740)</b> to use staking.
      </p>
    );
  }

  return (
    <div className="p-4 border rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Staking</h2>

      <p>
        Balance: {balance} MFG | Staked: {staked} MFG | Rewards: {rewards} MFG
      </p>

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
          className="bg-blue-600 text-white px-4 py-2 rounded-xl"
        >
          Approve
        </button>
      ) : (
        <button
          onClick={handleStake}
          className="bg-green-600 text-white px-4 py-2 rounded-xl"
        >
          Stake
        </button>
      )}

      <div className="flex space-x-4">
        <button
          onClick={handleUnstake}
          className="bg-red-600 text-white px-4 py-2 rounded-xl"
        >
          Unstake
        </button>
        <button
          onClick={handleClaim}
          className="bg-yellow-600 text-black px-4 py-2 rounded-xl"
        >
          Claim Rewards
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
