"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
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

// --- ABIs ---
import ERC20_ABI from "@abis/ERC20.json";
import STAKING_ABI from "@abis/Staking.json";

// --- Pool ID ---
const POOL_ID = 0;

export default function StakingSection() {
  const { isConnected, address, chain } = useAccount();
  const { connect } = useConnect();
  const { writeContract, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [stakeAmount, setStakeAmount] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // --- Determine network ---
  const isTestnet = chain?.id === PEPU_TESTNET_ID;
  const isMainnet = chain?.id === PEPU_MAINNET_ID;

  const MFG_ADDRESS = isTestnet ? MFG_TEST_ADDRESS : MFG_MAIN_ADDRESS;
  const PTX_ADDRESS = isTestnet ? PTX_TEST_ADDRESS : PTX_MAIN_ADDRESS;
  const STAKING_ADDRESS = isTestnet ? STAKING_TEST_ADDRESS : undefined; // Mainnet staking contract not deployed yet

  const isCorrectNetwork = isTestnet || isMainnet;

  // --- Reads ---
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: MFG_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, STAKING_ADDRESS!],
    query: { enabled: isConnected && !!STAKING_ADDRESS && !!address },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: MFG_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: isConnected && !!address },
  });

  const { data: stakedData, refetch: refetchStaked } = useReadContract({
    address: STAKING_ADDRESS!,
    abi: STAKING_ABI,
    functionName: "userInfo",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && !!STAKING_ADDRESS && !!address },
  });

  const { data: pendingRewardsData, refetch: refetchRewards } = useReadContract({
    address: STAKING_ADDRESS!,
    abi: STAKING_ABI,
    functionName: "pendingRewards",
    args: [POOL_ID, address!],
    query: { enabled: isConnected && !!STAKING_ADDRESS && !!address },
  });

  // --- Derived values ---
  const allowance: bigint = (allowanceData as bigint) ?? 0n;
  const stakeAmountBN: bigint = stakeAmount ? parseUnits(stakeAmount, 18) : 0n;
  const needsApproval = stakeAmountBN > allowance;

  const balance = balanceData ? formatUnits(balanceData as bigint, 18) : "0";
  const staked = stakedData ? formatUnits((stakedData as any)[0], 18) : "0";
  const rewards = pendingRewardsData ? formatUnits(pendingRewardsData as bigint, 18) : "0";

  // --- Wallet connect handlers ---
  const handleMetaMaskConnect = async () => connect({ connector: injected() });
  const handleWalletConnect = async () =>
    connect({ connector: walletConnect({ projectId: "efce48a19d0c7b8b8da21be2c1c8c271" }) });
  const handleCoinbaseConnect = async () => connect({ connector: coinbaseWallet() });

  // --- Actions ---
  const handleApprove = () => {
    writeContract({
      address: MFG_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [STAKING_ADDRESS!, maxUint256],
    });
    setTimeout(() => refetchAllowance(), 5000);
  };

  const handleStake = () => {
    if (!STAKING_ADDRESS) return;
    if (parseFloat(stakeAmount) > parseFloat(balance)) {
      return setNotification({ message: "Insufficient MFG balance.", type: "error" });
    }
    writeContract({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [POOL_ID, stakeAmountBN],
    });
    setStakeAmount("");
  };

  const handleUnstake = () => {
    if (!STAKING_ADDRESS) return;
    writeContract({
      address: STAKING_ADDRESS,
      abi: STAKING_ABI,
      functionName: "unstake",
      args: [POOL_ID, stakedData ? (stakedData as any)[0] : 0n],
    });
  };

  const handleClaim = () => {
    if (!STAKING_ADDRESS) return;
    writeContract({
      address: STAKING_ADDRESS,
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
    return (
      <div className="space-y-2">
        <p>Please connect your wallet:</p>
        <button onClick={handleMetaMaskConnect} className="bg-blue-600 text-white px-4 py-2 rounded-xl">
          MetaMask
        </button>
        <button onClick={handleWalletConnect} className="bg-purple-600 text-white px-4 py-2 rounded-xl">
          WalletConnect
        </button>
        <button onClick={handleCoinbaseConnect} className="bg-indigo-600 text-white px-4 py-2 rounded-xl">
          Coinbase Wallet
        </button>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return <p>Please switch to PepU Testnet or Mainnet to use staking.</p>;
  }

  if (!STAKING_ADDRESS) {
    return <p>Staking contract not deployed on this network yet.</p>;
  }

  return (
    <div className="p-4 border rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-bold">Staking</h2>

      <div className="flex justify-between">
        <div>
          <p>MFG Staked: {staked}</p>
          <button onClick={handleUnstake} className="bg-red-600 text-white px-4 py-2 rounded-xl mt-1">
            Unstake
          </button>
        </div>
        <div>
          <p>PTX Rewards: {rewards}</p>
          <button onClick={handleClaim} className="bg-yellow-600 text-black px-4 py-2 rounded-xl mt-1">
            Claim
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
        <button onClick={handleApprove} className="bg-blue-600 text-white px-4 py-2 rounded-xl w-full">
          Approve
        </button>
      ) : (
        <button onClick={handleStake} className="bg-green-600 text-white px-4 py-2 rounded-xl w-full">
          Stake
        </button>
      )}

      {notification && (
        <p className={`mt-2 ${notification.type === "error" ? "text-red-600" : "text-green-600"}`}>
          {notification.message}
        </p>
      )}
    </div>
  );
}
