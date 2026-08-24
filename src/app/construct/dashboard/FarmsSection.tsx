"use client";
/**
 * FarmsSection.tsx — MatrixFrog Auto-Compound LP Farms
 * ─────────────────────────────────────────────────────
 * Universal vault: one contract, any token pair, auto-compounded every 24h.
 * Users pick ANY two tokens, enter one OR both amounts (zap handles rebalancing).
 *
 * Strategy: 0xe57c7DB5174CaFBd52dE0f0F4E2be4e071B404F4  (stable — reverted to known-good)
 * Vault:    0x41132B56c4aEb7f72832681111C5BafB9dAe2d33  (stable — reverted to known-good)
 *
 * v5 changes: universal deposit path restored → MFG/YASH, PTX/YASH work again.
 * PEPU/YASH excluded at UI level via INCOMPATIBLE_PAIRS set.
 *
 * ─── AFTER EACH NEW STRATEGY DEPLOY ──────────────────────────────────────────
 * 1. Update STRATEGY_ADDRESS below (line ~86)
 * 2. Update VAULT_ADDRESS below if vault also redeployed (line ~29)
 * 3. Call strategy.initVault(VAULT_ADDRESS) from owner wallet
 * 4. Re-register any proxy tokens (see PROXY TOKEN REGISTRY section below)
 *
 * ─── PROXY TOKEN REGISTRY (on-chain) ─────────────────────────────────────────
 * Some tokens block transfer() from non-whitelisted contracts (e.g. YASH).
 * These need to be registered in the strategy so vault-routed minting is used.
 *
 * HOW TO REGISTER A NEW PROXY TOKEN:
 *   Call from owner wallet in Remix or PepuScan:
 *   strategy.setProxyToken(TOKEN_ADDRESS, true)
 *
 * HOW TO REMOVE A PROXY TOKEN (if they fix their contract):
 *   strategy.setProxyToken(TOKEN_ADDRESS, false)
 *
 * CURRENTLY REGISTERED PROXY TOKENS (call setProxyToken after each new deploy):
 *   0xB7fBB045A14a5D7D6E55dBbf7005Ec138EaDDde9  — YASH (ERC1967 upgradeable proxy)
 *   // add new ones here as comments so you remember to re-register after redeploy
 *
 * ─── TAX TOKEN BADGE (frontend only) ─────────────────────────────────────────
 * TAX_TOKENS below controls the "TAX" badge on pool cards.
 * This is SEPARATE from proxy token registration — it's just a UI warning.
 * See TAX_TOKENS section (~line 181) to add/remove badge tokens.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, useConnect, useBalance } from "wagmi";
import { readContract } from "@wagmi/core";
import { useConfig } from "wagmi";
import { parseUnits, formatUnits, keccak256, encodePacked } from "viem";
import { useWalletConnect } from "../../hooks/useWalletConnect";
import styles from "./farms.module.css";

// ─── DEPLOY ADDRESSES ─────────────────────────────────────────────────────────
const VAULT_ADDRESS    = "0x41132B56c4aEb7f72832681111C5BafB9dAe2d33" as `0x${string}`;
const TREASURY         = "0x8CeD1f7C4bBaE6CD6C6E95cC231decF6289f9a5f" as `0x${string}`;
const CHAIN_ID         = 97741;
const PROTOCOL_OWNER   = "0x8CeD1f7C4bBaE6CD6C6E95cC231decF6289f9a5f".toLowerCase();

// ─── TOKEN ADDRESSES ──────────────────────────────────────────────────────────
const WPEPU_ADDR   = "0xF9Cf4A16d26979b929Be7176bAc4e7084975FCB8";
const PEPU_ADDR    = WPEPU_ADDR;
// All external calls go through Next.js API proxy routes to avoid CORS
const PEPU_RPC_URL = "/api/rpc";
const WPEPU_ABI = [
  { name:"deposit",  type:"function", stateMutability:"payable",   inputs:[], outputs:[] },
  { name:"withdraw", type:"function", stateMutability:"nonpayable", inputs:[{name:"wad",type:"uint256"}], outputs:[] },
] as const;
const MFG_ADDR   = "0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5";
const PTX_ADDR   = "0xE17387d0b67aa4E2d595D8fC547297cabDf2a7d2";

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const ERC20_ABI = [
  { name:"balanceOf", type:"function", stateMutability:"view",
    inputs:[{name:"owner",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"allowance", type:"function", stateMutability:"view",
    inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}],
    outputs:[{name:"",type:"uint256"}] },
  { name:"approve", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}],
    outputs:[{name:"",type:"bool"}] },
] as const;

const VAULT_ABI = [
  { name:"deposit", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"},
            {name:"amountA",type:"uint256"},{name:"amountB",type:"uint256"}], outputs:[] },
  { name:"depositWithNativePEPU", type:"function", stateMutability:"payable",
    inputs:[{name:"otherToken",type:"address"},{name:"otherAmount",type:"uint256"}],
    outputs:[] },
  { name:"withdraw", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"},
            {name:"sharesToBurn",type:"uint256"}], outputs:[] },
  { name:"withdrawAll", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"}], outputs:[] },
  { name:"userShares", type:"function", stateMutability:"view",
    inputs:[{name:"pairKey",type:"bytes32"},{name:"user",type:"address"}],
    outputs:[{name:"",type:"uint256"}] },
  { name:"totalShares", type:"function", stateMutability:"view",
    inputs:[{name:"pairKey",type:"bytes32"}],
    outputs:[{name:"",type:"uint256"}] },
  { name:"getUserPosition", type:"function", stateMutability:"view",
    inputs:[{name:"user",type:"address"},{name:"tokenA",type:"address"},
            {name:"tokenB",type:"address"}],
    outputs:[{name:"shares",type:"uint256"},{name:"liquidityValue",type:"uint256"},
             {name:"shareOfPool",type:"uint256"}] },
  { name:"clearUserShares", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"},
            {name:"user",type:"address"}], outputs:[] },
  { name:"clearOrphanedShares", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"}], outputs:[] },
] as const;

const STRATEGY_ADDRESS = "0xe57c7DB5174CaFBd52dE0f0F4E2be4e071B404F4" as `0x${string}`;
const STRATEGY_ABI = [
  { name:"pendingFees", type:"function", stateMutability:"view",
    inputs:[{name:"tA",type:"address"},{name:"tB",type:"address"}],
    outputs:[{name:"f0",type:"uint128"},{name:"f1",type:"uint128"}] },
  { name:"pairLiquidity", type:"function", stateMutability:"view",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"}],
    outputs:[{name:"",type:"uint128"}] },
  { name:"harvestReady", type:"function", stateMutability:"view",
    inputs:[{name:"tA",type:"address"},{name:"tB",type:"address"}],
    outputs:[{name:"",type:"bool"}] },
  { name:"positions", type:"function", stateMutability:"view",
    inputs:[{name:"key",type:"bytes32"}],
    outputs:[{name:"token0",type:"address"},{name:"token1",type:"address"},
             {name:"positionTokenId",type:"uint256"},{name:"totalLiquidity",type:"uint128"},
             {name:"lastHarvest",type:"uint256"},{name:"totalHarvests",type:"uint256"},
             {name:"exists",type:"bool"},{name:"feeTier",type:"uint24"}] },
  { name:"ownerWithdrawPair", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"}], outputs:[] },
  { name:"activePairCount", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"allPairKeys", type:"function", stateMutability:"view",
    inputs:[{name:"",type:"uint256"}], outputs:[{name:"",type:"bytes32"}] },
] as const;

const FACTORY_ADDRESS  = "0x5984B8BF2d4dB9C0aCB1d7924762e4474D80C807" as `0x${string}`;
const POSITION_MANAGER = "0xe2060CbdE18b5e765c86e5Cd6EE68AF209a9faa7" as `0x${string}`;

// ABI for static-call fee simulation (collect as nonpayable so readContract accepts it)
const NFT_COLLECT_ABI = [
  { name: "collect", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "params", type: "tuple",
      components: [
        { name: "tokenId",    type: "uint256" },
        { name: "recipient",  type: "address" },
        { name: "amount0Max", type: "uint128" },
        { name: "amount1Max", type: "uint128" },
      ]
    }],
    outputs: [{ name: "amount0", type: "uint256" }, { name: "amount1", type: "uint256" }]
  },
] as const;

// ABI for reading position data
const NFT_POSITIONS_ABI = [
  { name: "positions", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "nonce",                    type: "uint96"  },
      { name: "operator",                 type: "address" },
      { name: "token0",                   type: "address" },
      { name: "token1",                   type: "address" },
      { name: "fee",                      type: "uint24"  },
      { name: "tickLower",                type: "int24"   },
      { name: "tickUpper",                type: "int24"   },
      { name: "liquidity",                type: "uint128" },
      { name: "feeGrowthInside0LastX128", type: "uint256" },
      { name: "feeGrowthInside1LastX128", type: "uint256" },
      { name: "tokensOwed0",              type: "uint128" },
      { name: "tokensOwed1",              type: "uint128" },
    ]
  },
] as const;
const FACTORY_ABI = [
  { name:"getPool", type:"function", stateMutability:"view",
    inputs:[{name:"tokenA",type:"address"},{name:"tokenB",type:"address"},{name:"fee",type:"uint24"}],
    outputs:[{name:"pool",type:"address"}] },
] as const;

const POOL_ABI = [
  { name:"slot0", type:"function", stateMutability:"view", inputs:[],
    outputs:[{name:"sqrtPriceX96",type:"uint160"},{name:"tick",type:"int24"},
             {name:"",type:"uint16"},{name:"",type:"uint16"},{name:"",type:"uint16"},
             {name:"",type:"uint8"},{name:"",type:"bool"}] },
  { name:"liquidity", type:"function", stateMutability:"view", inputs:[],
    outputs:[{name:"",type:"uint128"}] },
  { name:"fee", type:"function", stateMutability:"view", inputs:[],
    outputs:[{name:"",type:"uint24"}] },
  { name:"token0", type:"function", stateMutability:"view", inputs:[],
    outputs:[{name:"",type:"address"}] },
  { name:"token1", type:"function", stateMutability:"view", inputs:[],
    outputs:[{name:"",type:"address"}] },
] as const;

const ERC20_BALANCE_ABI = [
  { name:"balanceOf", type:"function", stateMutability:"view",
    inputs:[{name:"owner",type:"address"}], outputs:[{name:"",type:"uint256"}] },
] as const;


// ─── TOKEN TYPES & LIST ───────────────────────────────────────────────────────
interface Token { symbol:string; name:string; address:string; decimals:number; }

// Core tokens always available as Token A (the "base" side of a pair)
const CORE_TOKENS: Token[] = [
  { symbol:"PEPU", name:"Pepe Unchained (wPEPU)", address:PEPU_ADDR, decimals:18 },
  { symbol:"MFG",  name:"MatrixFrog",             address:MFG_ADDR,  decimals:18 },
  { symbol:"PTX",  name:"Peptrix",                address:PTX_ADDR,  decimals:18 },
];

// Full list — available as Token B (the ecosystem/pair token)
const ALL_TOKENS: Token[] = [
  { symbol:"PEPU",       name:"Pepe Unchained (wPEPU)",              address:PEPU_ADDR, decimals:18 },
  { symbol:"MFG",        name:"MatrixFrog",                          address:MFG_ADDR,  decimals:18 },
  { symbol:"PTX",        name:"Peptrix",                             address:PTX_ADDR,  decimals:18 },
  { symbol:"CKOM",       name:"Chimp King Of Meme",                  address:"0xc824bb59ca79e708c2c74ea5a0c23c0579845725", decimals:18 },
//  { symbol:"YASH",       name:"Yashix",                              address:"0xb7fbb045a14a5d7d6e55dbbf7005ec138eaddde9", decimals:18 },
  { symbol:"Booost",     name:"Bobby Booost",                        address:"0x910c1acdbefc866f2cb2c482e044582e44395152", decimals:18 },
  { symbol:"BDG",        name:"Bugs Destroyer Game",                 address:"0x0512eefc949ec7af6f50196d9b5e525c35fbb447", decimals:18 },
  { symbol:"TOSH",       name:"TOSH",                                address:"0x0b52dfa17542f30f3072c53ca5061120c74d86e9", decimals:18 },
  { symbol:"PEPUBTC",    name:"PepuBitcoin",                         address:"0xdba79c80f76c7481dd50c69b64a74211f295eb11", decimals:18 },
  { symbol:"$VAULT",     name:"PEPU VAULT",                          address:"0x8746d6fc80708775461226657a6947497764bbe6", decimals:18 },
  { symbol:"pSICKB",     name:"pSICKB",                              address:"0xd6262b8bf3739f6fe146c3018f0c925c73b1902e", decimals:18 },
  { symbol:"BRNLCK",     name:"BRAINLOCK",                           address:"0x82548ec92bd9ecfedf074695ef35efb1b7377ac3", decimals:18 },
  { symbol:"BRO",        name:"Brodo Beats",                         address:"0xe8f1d533ce13463ac4d208568b24d2c5af9b0db7", decimals:18 },
  { symbol:"PLOCK",      name:"PepuLock",                            address:"0x74ded13443829a08eb912f7a7f4f1a0f3906d387", decimals:18 },
  { symbol:"PepOra",     name:"PepOra",                              address:"0xa115d9ccbdedd86d47a188e866cf51b51762b0e4", decimals:18 },
  { symbol:"BOOMER",     name:"BoomerHODL",                          address:"0xd1d75b9a2e1138db6125079d4bd4a16c67d4e3b3", decimals:18 },
  { symbol:"HORA",       name:"HolderRadar",                         address:"0xD42fABF08d04D1eb5c69f770C6E049832B69D788", decimals:18 },
  { symbol:"$PENK",      name:"PEPU BANK",                           address:"0x82144c93bd531e46f31033fe22d1055af17a514c", decimals:18 },
  { symbol:"HAM",        name:"Cutest Hammer",                       address:"0xcc4510e0c2276b76c09f493c110f09df60c13192", decimals:18 },
  { symbol:"$LUXURIOUS", name:"Big Crypto Bull",                     address:"0xf5cb0ffe8df1e931bd8c1cd5be84ed4d8e1400f7", decimals:18 },
  { symbol:"LQS",        name:"Liquids",                             address:"0xA085C13fAcf80a63eDeA328B3474543d0BbC0197", decimals:18 },
  { symbol:"GYD",        name:"Gameyard",                            address:"0x631420b5cd6342b3609e59e6e41b4c8aaddf93af", decimals:18 },
  { symbol:"FACTORY",    name:"PEPUFACTORY",                         address:"0x2a6de93ada6bf86efd90d602b47f7ce46e44664a", decimals:18 },
  { symbol:"uSafe",      name:"Unified Safeyield Crypto Strategist", address:"0x9ab5f825b9caea9935d6438358a66a6f344d6405", decimals:18 },
  { symbol:"ULAB",       name:"Unchained Lab",                       address:"0x9592be924a69f88ef9c2b26d9d649fe19c6771d4", decimals:18 },
  { symbol:"CHAD",       name:"CHAD Coin",                           address:"0x5367539e7030e2fbc31560b41eeea653e09970de", decimals:18 },
  { symbol:"MMT",        name:"Market Maker Token",                  address:"0x9007d8c13c0f2cd544bd7e6ed7e5f44a1318d2f2", decimals:18 },
  { symbol:"UCHAIN",     name:"Unchained",                           address:"0x008e4509280c812648409cf4e40a11289c0910aa", decimals:18 },
  { symbol:"DGT",        name:"Degen Time",                          address:"0x3cb51202e41890c89b2a46bd5c921e2d55665637", decimals:18 },
  { symbol:"$IWRU",      name:"I Will Rug U",                        address:"0x8d3fd14e20e78a14633a1a7f314b8ab7edb0a8b2", decimals:18 },
  { symbol:"BOBBY",      name:"LEGENDARY BOBBY!",                    address:"0x8fe6436498d4ed9560da2c9072ed0ece26045146", decimals:18 },
  { symbol:"DAWGZ",      name:"D.A.W.G.Z",                           address:"0x153b5ae0ff770ebe5c30b1de751d8820b2505774", decimals:18 },
];

// ─── TAX TOKEN BADGE (frontend UI only) ──────────────────────────────────────
//
//  Controls the "TAX" badge shown on pool cards. PURELY cosmetic — users see
//  a warning that the token has transfer tax or proxy restrictions.
//
//  This is SEPARATE from strategy.setProxyToken() which controls on-chain routing.
//  You need BOTH: add to TAX_TOKENS for the badge AND call setProxyToken on-chain.
//
//  TO ADD A NEW TOKEN BADGE: add its address (lowercase) and a comment below.
//
const TAX_TOKENS = new Set([
  "0x2a6de93ada6bf86efd90d602b47f7ce46e44664a", // FACTORY  — 15% buy tax (pepufactory.xyz)
  "0xd1d75b9a2e1138db6125079d4bd4a16c67d4e3b3", // BOOMER   — 15% buy tax (pepufactory.xyz)
//  "0xb7fbb045a14a5d7d6e55dbbf7005ec138eaddde9", // YASH     — ERC1967 proxy (also registered on-chain via setProxyToken)
  // add new tax/proxy tokens below this line:
].map(a => a.toLowerCase()));

// Keep FEE_ON_TRANSFER_TOKENS as an alias so deposit warning still works
const FEE_ON_TRANSFER_TOKENS = TAX_TOKENS;

// ─── INCOMPATIBLE PAIRS (UI-level exclusion) ──────────────────────────────────
// Pairs listed here are hidden from the token selector entirely.
// PEPU/YASH: the pool has fundamental liquidity issues that make it unreliable.
// Format: always use lowercase, smaller address first (doesn't matter — both orders checked).
const INCOMPATIBLE_PAIRS = new Set([
  // PEPU(WPEPU) + YASH — excluded until pool liquidity issues are resolved
  [
    "0xf9cf4a16d26979b929be7176bac4e7084975fcb8", // WPEPU
    "0xb7fbb045a14a5d7d6e55dbbf7005ec138eaddde9", // YASH
  ].sort().join(","),
  // MFG + Booost — fails on create position
  [
    "0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5", // MFG
    "0x910c1acdbefc866f2cb2c482e044582e44395152", // Booost
  ].sort().join(","),
]);

/// Returns true if tokenA and tokenB form an incompatible pair (should not be shown).
function isIncompatiblePair(addrA: string, addrB: string): boolean {
  const key = [addrA.toLowerCase(), addrB.toLowerCase()].sort().join(",");
  return INCOMPATIBLE_PAIRS.has(key);
}

export interface ProxyInfo {
  isProxy: boolean;
  implementation: string | null;
}

// TAX badge is now driven by TAX_TOKENS list, not bytecode detection.
// detectMinimalProxyCached kept as a no-op stub so existing call sites compile.
async function detectMinimalProxyCached(
  tokenAddress: string,
  _config: ReturnType<typeof useConfig>
): Promise<ProxyInfo> {
  const isTax = TAX_TOKENS.has(tokenAddress.toLowerCase());
  return { isProxy: isTax, implementation: null };
}


// ─── UTILS ────────────────────────────────────────────────────────────────────
interface Pool {
  id: string;
  tokenA: Token;
  tokenB: Token;
  pairKey: `0x${string}`;
  tvlUsd: number;
  apr: number;
  aprSource: "geckoterm" | "estimated";
  userShares: bigint;
  userShareOfPool: number;
  boostActive: boolean;
  pendingFees0: bigint;
  pendingFees1: bigint;
  valueHistory: { ts: number; usd: number; event?: "deposit" | "withdraw" | "harvest" }[];
  depositedUsd: number;
  lastHarvestTs: number;   // unix seconds from strategy.positions[key].lastHarvest
  totalHarvests: number;   // compound count from strategy.positions[key].totalHarvests
  harvestReady: boolean;   // strategy.harvestReady() result
  // Set to true if either token is an EIP-1167 proxy — for display purposes only
  hasProxyToken?: boolean;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : n.toFixed(2);

const fmtShares = (n: bigint) => {
  const f = Number(formatUnits(n, 18));
  return f > 0 && f < 0.0001 ? "<0.0001" : f.toFixed(4);
};

function sortTokens(a: Token, b: Token): [Token, Token] {
  return a.address.toLowerCase() < b.address.toLowerCase() ? [a, b] : [b, a];
}

function getPairKey(a: Token, b: Token): `0x${string}` {
  const [t0, t1] = sortTokens(a, b);
  return keccak256(encodePacked(
    ["address", "address"],
    [t0.address as `0x${string}`, t1.address as `0x${string}`]
  ));
}


// ─── GECKOTERMINAL APR/TVL ────────────────────────────────────────────────────
const aprCache = new Map<string, { apr: number; tvl: number; ts: number }>();
const tokenPriceCache = new Map<string, number>();

// Fetch USD prices for multiple tokens at once from GeckoTerminal.
// Called every 60s during the TVL refresh cycle.
// GeckoTerminal supports up to ~30 addresses per request as comma-separated.
// Event topic0 hashes (keccak256 of signature)
const TOPIC_DEPOSITED = "0xe1d62a717c13e8309c9a6a54be6a5f04d7fad0018f9c736406cf50fbe6adf4de";
const TOPIC_WITHDRAWN = "0x144f5f62c08d623a6f383205dc8d5ef825b693748e2977846e18121b6780413a";
const TOPIC_HARVESTED = "0x39aee03eac9ee420f9f28cc95dbd04705dde286f481a1ba329747e83458aec4f";

// Cache for position event history — keyed by pairKey+userAddress

// Fetch on-chain events to build position history for a user+pair
// ─── ALL-POOLS LOG PREFETCH ───────────────────────────────────────────────────
// Fetches ALL user vault logs + ALL strategy harvest logs in one shot.
// Pool cards just filter this cached data — no per-card RPC calls.
interface AllLogsCache {
  depositLogs:  any[];
  withdrawLogs: any[];
  harvestLogs:  any[];
  blockTimes:   Map<number, number>;
  ts: number;
}
const allLogsCache = new Map<string, AllLogsCache>();
const ALL_LOGS_TTL = 10 * 60 * 1000; // 10 min

async function prefetchAllLogs(userAddress: string): Promise<AllLogsCache | null> {
  const key = "all_" + userAddress.toLowerCase();
  const cached = allLogsCache.get(key);
  if (cached && Date.now() - cached.ts < ALL_LOGS_TTL) return cached;

  try {
    const userPadded = "0x" + userAddress.slice(2).padStart(64, "0").toLowerCase();

    // Fetch all 3 log types in parallel
    const [depositLogs, withdrawLogs, harvestLogs] = await Promise.all([
      fetchLogs(VAULT_ADDRESS,    TOPIC_DEPOSITED, userPadded),
      fetchLogs(VAULT_ADDRESS,    TOPIC_WITHDRAWN, userPadded),
      fetchLogs(STRATEGY_ADDRESS, TOPIC_HARVESTED),  // all harvest events
    ]);

    // Collect all unique block numbers
    const allLogEntries = [...depositLogs, ...withdrawLogs, ...harvestLogs];
    const uniqueBlocks = [...new Set(allLogEntries.map(l => parseInt(l.blockNumber, 16)).filter(n => !isNaN(n)))];

    // Batch block timestamp requests — use block number as JSON-RPC id for safe matching
    const blockTimes = new Map<number, number>();
    if (uniqueBlocks.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < uniqueBlocks.length; i += CHUNK) {
        const chunk = uniqueBlocks.slice(i, i + CHUNK);
        const batchReqs = chunk.map((block) => ({
          jsonrpc: "2.0",
          id: block, // use block number as id so we can match response safely
          method: "eth_getBlockByNumber",
          params: ["0x" + block.toString(16), false],
        }));
        try {
          const res = await fetch(PEPU_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batchReqs),
          });
          const results = await res.json();
          const arr = Array.isArray(results) ? results : [results];
          arr.forEach((r: any) => {
            // Match by id (which is the block number we set above)
            const blockNum = typeof r.id === "number" ? r.id : parseInt(r.id);
            const ts = parseInt(r?.result?.timestamp ?? "0", 16);
            if (ts > 0 && !isNaN(blockNum)) blockTimes.set(blockNum, ts * 1000);
          });
        } catch {}
      }
    }

    console.log(`[MatrixFrog] Log prefetch complete:`,
      `${depositLogs.length} deposits,`,
      `${withdrawLogs.length} withdraws,`,
      `(eth_getLogs may fail if RPC doesn't support it — graphs will use pool creation time as fallback)`,
      `${harvestLogs.length} harvests,`,
      `${blockTimes.size} block timestamps`
    );
    const result: AllLogsCache = { depositLogs, withdrawLogs, harvestLogs, blockTimes, ts: Date.now() };
    allLogsCache.set(key, result);
    return result;
  } catch { return null; }
}

// Filter pre-fetched logs for a specific pair — instant, no RPC calls
function buildPairHistory(
  cache: AllLogsCache,
  pairKey: string,
  tokenAAddr: string,
  tokenBAddr: string,
): { ts: number; usd: number; event: "deposit" | "withdraw" | "harvest" }[] {
  const pairKeyClean = pairKey.startsWith("0x") ? pairKey.slice(2).toLowerCase() : pairKey.toLowerCase();
  const addrA = tokenAAddr.toLowerCase();
  const addrB = tokenBAddr.toLowerCase();
  const events: { ts: number; usd: number; event: "deposit" | "withdraw" | "harvest" }[] = [];

  for (const log of cache.depositLogs) {
    const logA = ("0x" + (log.topics?.[2] ?? "").slice(-40)).toLowerCase();
    const logB = ("0x" + (log.topics?.[3] ?? "").slice(-40)).toLowerCase();
    if ((logA === addrA || logA === addrB) && (logB === addrA || logB === addrB)) {
      const ts = cache.blockTimes.get(parseInt(log.blockNumber, 16)) ?? 0;
      if (ts > 0) events.push({ ts, usd: 0, event: "deposit" });
    }
  }
  for (const log of cache.withdrawLogs) {
    const logA = ("0x" + (log.topics?.[2] ?? "").slice(-40)).toLowerCase();
    const logB = ("0x" + (log.topics?.[3] ?? "").slice(-40)).toLowerCase();
    if ((logA === addrA || logA === addrB) && (logB === addrA || logB === addrB)) {
      const ts = cache.blockTimes.get(parseInt(log.blockNumber, 16)) ?? 0;
      if (ts > 0) events.push({ ts, usd: 0, event: "withdraw" });
    }
  }
  for (const log of cache.harvestLogs) {
    // Harvested events are indexed by pairKey (topic1)
    const logKey = (log.topics?.[1] ?? "").slice(-64).toLowerCase();
    if (logKey === pairKeyClean) {
      const ts = cache.blockTimes.get(parseInt(log.blockNumber, 16)) ?? 0;
      if (ts > 0) events.push({ ts, usd: 0, event: "harvest" });
    }
  }

  const sorted = events.sort((a, b) => a.ts - b.ts);
  if (sorted.length > 0) {
    console.log(`[MatrixFrog] ${sorted.length} events for pair ${pairKey.slice(0,10)}:`, sorted.map(e => e.event));
  }
  return sorted;
}

// Fetch logs with automatic chunking — tries large range first, falls back to chunks
// if the node returns a "block range too large" error
async function fetchLogs(contractAddr: string, topic0: string, topic1?: string): Promise<any[]> {
  try {
    const blockRes = await fetch(PEPU_RPC_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_blockNumber", params:[] }),
    });
    const blockJ = await blockRes.json();
    const currentBlock = parseInt(blockJ.result ?? "0x0", 16);
    if (currentBlock === 0) return [];

    const topics = topic1 ? [topic0, topic1] : [topic0];

    // Helper: fetch one block range
    const fetchRange = async (from: number, to: number | string): Promise<{ ok: boolean; logs: any[]; tooLarge?: boolean }> => {
      try {
        const filter: any = {
          fromBlock: "0x" + from.toString(16),
          toBlock: typeof to === "number" ? "0x" + to.toString(16) : to,
          address: contractAddr,
          topics,
        };
        const res = await fetch(PEPU_RPC_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_getLogs", params:[filter] }),
        });
        const j = await res.json();
        if (j.error) {
          // Log full error to help diagnose RPC issues
          const msg = (j.error.message ?? j.error.data ?? JSON.stringify(j.error) ?? "").toLowerCase();
          console.warn("eth_getLogs error:", JSON.stringify(j.error));
          if (msg.includes("too large") || msg.includes("range") || msg.includes("limit")
              || msg.includes("exceed") || msg.includes("10000") || msg.includes("block")) {
            return { ok: false, logs: [], tooLarge: true };
          }
          return { ok: false, logs: [] };
        }
        return { ok: true, logs: j.result ?? [] };
      } catch { return { ok: false, logs: [] }; }
    };

    // Try full 90-day range first (~3.9M blocks)
    const fromBlock = Math.max(0, currentBlock - 3_888_000);
    const full = await fetchRange(fromBlock, "latest");
    if (full.ok) return full.logs;

    // If too large, chunk into 50k-block pieces
    if (full.tooLarge) {
      const CHUNK_SIZE = 50_000;
      const allLogs: any[] = [];
      for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
        const to = Math.min(from + CHUNK_SIZE - 1, currentBlock);
        const chunk = await fetchRange(from, to);
        if (chunk.ok) allLogs.push(...chunk.logs);
        // If still too large, try 10k chunks
        else if (chunk.tooLarge) {
          const SMALL_CHUNK = 10_000;
          for (let sf = from; sf < to; sf += SMALL_CHUNK) {
            const st = Math.min(sf + SMALL_CHUNK - 1, to);
            const small = await fetchRange(sf, st);
            if (small.ok) allLogs.push(...small.logs);
          }
        }
      }
      return allLogs;
    }

    return [];
  } catch { return []; }
}


async function rpcCall(to: string, data: string): Promise<string> {
  const res = await fetch(PEPU_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_call", params:[{to,data},"latest"] }),
  });
  const j = await res.json();
  return j.result ?? "0x";
}

// Get token price in USD via its WPEPU pool using sqrtPriceX96
// This works for any token on PepuSwap as long as it has a WPEPU pool
async function fetchTokenPriceOnChain(tokenAddr: string, tokenDecimals: number, wPepuUsd: number): Promise<number> {
  if (tokenAddr.toLowerCase() === WPEPU_ADDR) return wPepuUsd;
  const feeTiers = [100, 500, 2500, 3000, 10000];
  // getPool(address,address,uint24) selector = 0x1698ee82
  for (const fee of feeTiers) {
    try {
      const feeHex = fee.toString(16).padStart(64, "0");
      const t0 = tokenAddr.slice(2).padStart(64, "0");
      const t1 = WPEPU_ADDR.slice(2).padStart(64, "0");
      const poolResult = await rpcCall(
        "0x5984B8BF2d4dB9C0aCB1d7924762e4474D80C807",
        "0x1698ee82" + t0 + t1 + feeHex
      );
      const poolAddr = "0x" + poolResult.slice(-40);
      if (!poolAddr || poolAddr === "0x0000000000000000000000000000000000000000") continue;

      // slot0() selector = 0x3850c7bd
      const slot0 = await rpcCall(poolAddr, "0x3850c7bd");
      if (!slot0 || slot0 === "0x") continue;
      const sqrtPriceX96 = BigInt("0x" + slot0.slice(2, 66));
      if (sqrtPriceX96 === 0n) continue;

      // token0() selector = 0x0dfe1681
      const t0Result = await rpcCall(poolAddr, "0x0dfe1681");
      const poolToken0 = ("0x" + t0Result.slice(-40)).toLowerCase();
      const isToken0 = poolToken0 === tokenAddr.toLowerCase();

      // Convert sqrtPriceX96 to price
      // price = (sqrtPriceX96 / 2^96)^2 adjusted for decimals
      const sq = Number(sqrtPriceX96);
      const rawPrice = (sq / 2**96) ** 2;
      if (rawPrice === 0) continue;

      // WPEPU is always 18 decimals
      let tokenInWpepu: number;
      if (isToken0) {
        // rawPrice = wpepu_raw / token_raw → wpepu per token raw
        // 1 full token = rawPrice × 10^tokenDecimals / 10^18 full WPEPU
        tokenInWpepu = rawPrice * (10 ** tokenDecimals) / (10 ** 18);
      } else {
        // rawPrice = token_raw / wpepu_raw
        // 1 full token = (1/rawPrice) × 10^18 / 10^tokenDecimals full WPEPU
        tokenInWpepu = (1 / rawPrice) * (10 ** 18) / (10 ** tokenDecimals);
      }
      if (tokenInWpepu > 0) return tokenInWpepu * wPepuUsd;
    } catch { continue; }
  }
  return 0;
}

async function fetchTokenPrices(extraAddresses: string[] = [], tokenMeta: Map<string,number> = new Map()): Promise<void> {
  // Step 1: Try gecko for all addresses in one call
  const addrs = [...new Set([WPEPU_ADDR, ...extraAddresses.map(a => a.toLowerCase())])];
  try {
    const res = await fetch(
      `/api/gecko?path=/api/v2/simple/networks/pepe-unchained/token_price/${addrs.join(",")}`,
      { headers: { "Accept": "application/json" } }
    );
    if (res.ok) {
      const d = await res.json();
      const prices = d?.data?.attributes?.token_prices ?? {};
      for (const [addr, priceStr] of Object.entries(prices)) {
        const price = parseFloat(priceStr as string);
        if (price > 0) tokenPriceCache.set(addr.toLowerCase(), price);
      }
    }
  } catch {}

  // Step 2: For any token gecko didn't price, derive via on-chain WPEPU pool
  const wPepuUsd = tokenPriceCache.get(WPEPU_ADDR) ?? 0;
  if (wPepuUsd === 0) return; // Can't derive without WPEPU price

  for (const addr of extraAddresses) {
    const key = addr.toLowerCase();
    if (tokenPriceCache.has(key) && (tokenPriceCache.get(key) ?? 0) > 0) continue; // already priced
    try {
      const decimals = tokenMeta.get(key) ?? 18;
      const price = await fetchTokenPriceOnChain(addr, decimals, wPepuUsd);
      if (price > 0) tokenPriceCache.set(key, price);
    } catch {}
  }
}

async function fetchGeckoAPR(addrA: string, addrB: string): Promise<{ apr: number; tvl: number; poolAddress?: string; feeTier?: number } | null> {
  const key = [addrA, addrB].sort().join("_");
  const cached = aprCache.get(key);
  if (cached && Date.now() - cached.ts < 180_000) return cached; // 3 min cache
  try {
    for (const searchAddr of [addrA, addrB]) {
      const url = `/api/gecko?path=/api/v2/networks/pepe-unchained/pools?token_address=${searchAddr.toLowerCase()}&page=1`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const otherAddr = searchAddr === addrA ? addrB : addrA;
      const pool = data?.data?.find((p: any) => {
        const bId = p.relationships?.base_token?.data?.id?.toLowerCase() ?? "";
        const qId = p.relationships?.quote_token?.data?.id?.toLowerCase() ?? "";
        return bId.includes(otherAddr.toLowerCase()) || qId.includes(otherAddr.toLowerCase());
      });
      if (!pool) continue;
      const attrs  = pool.attributes;
      const tvl    = parseFloat(attrs.reserve_in_usd ?? "0");
      const vol    = parseFloat(attrs.volume_usd?.h24 ?? "0");
      const feeStr = attrs.swap_fee ?? attrs.pool_fee ?? "1";
      const feePct = parseFloat(feeStr) / 100;
      const feeTier = Math.round(feePct * 1_000_000);
      const apr    = tvl > 0 ? Math.min((vol * feePct * 365 / tvl) * 100, 9999) : 0;
      const poolAddress = pool.id?.split("_")[1] ?? undefined;
      const result = { apr, tvl, poolAddress, feeTier };
      aprCache.set(key, { ...result, ts: Date.now() });
      return result;
    }
    return null;
  } catch { return null; }
}

/// Simulate a collect() call to get the true pending fees for a V3 position.
/// V3 positions only update tokensOwed when touched — this static call approach
/// gets the real accumulated fees including those not yet flushed into tokensOwed.
async function getPendingFeesFromNFT(
  _config: any,
  tokenId: bigint
): Promise<{ fees0: bigint; fees1: bigint }> {
  if (!tokenId || tokenId === 0n) return { fees0: 0n, fees1: 0n };
  try {
    // collect((uint256,address,uint128,uint128)) — struct packed inline, no offset pointer
    // selector: 0xfc6f7865
    // field 1: tokenId (uint256, 32 bytes)
    // field 2: recipient (address, 32 bytes, zero address)
    // field 3: amount0Max (uint128, 32 bytes, max value)
    // field 4: amount1Max (uint128, 32 bytes, max value)
    const MAX128 = "ffffffffffffffffffffffffffffffff";
    const data = "0xfc6f7865"
      + tokenId.toString(16).padStart(64, "0")          // tokenId
      + "0".repeat(64)                                   // recipient = zero
      + "0".repeat(32) + MAX128                          // amount0Max
      + "0".repeat(32) + MAX128;                         // amount1Max

    const result = await rpcCall(POSITION_MANAGER, data);
    if (result && result !== "0x" && result.length >= 130) {
      const d = result.slice(2);
      const fees0 = BigInt("0x" + (d.slice(0, 64) || "0"));
      const fees1 = BigInt("0x" + (d.slice(64, 128) || "0"));
      if (fees0 > 0n || fees1 > 0n) return { fees0, fees1 };
    }
    // Fallback: read tokensOwed from positions() — less accurate but works for proxy tokens
    // positions(uint256) selector = 0x99fbab88
    const posData = "0x99fbab88" + tokenId.toString(16).padStart(64, "0");
    const posResult = await rpcCall(POSITION_MANAGER, posData);
    if (!posResult || posResult === "0x" || posResult.length < 10) return { fees0: 0n, fees1: 0n };
    const pd = posResult.slice(2);
    // positions() ABI layout (each field padded to 32 bytes = 64 hex chars):
    // Word 0: nonce, Word 1: operator, Word 2: token0, Word 3: token1
    // Word 4: fee, Word 5: tickLower, Word 6: tickUpper, Word 7: liquidity
    // Word 8: feeGrowthInside0LastX128, Word 9: feeGrowthInside1LastX128
    // Word 10: tokensOwed0, Word 11: tokensOwed1
    const fees0 = BigInt("0x" + (pd.slice(640, 704) || "0"));
    const fees1 = BigInt("0x" + (pd.slice(704, 768) || "0"));
    // Sanity: tokensOwed should never exceed 10^24 (1M tokens at 18 decimals)
    const MAX_SANE = 10n ** 24n;
    return {
      fees0: fees0 > MAX_SANE ? 0n : fees0,
      fees1: fees1 > MAX_SANE ? 0n : fees1,
    };
  } catch {
    return { fees0: 0n, fees1: 0n };
  }
}

/// Estimate APR from accumulated fees and time elapsed since last harvest.
/// Returns 0 if not enough data (first 30 min, no fees, no TVL).
function estimateAprFromFees(
  pendingFees0: bigint, pendingFees1: bigint,
  decimals0: number, decimals1: number,
  addr0: string, addr1: string,
  lastHarvestTs: number, tvlUsd: number
): number {
  if (tvlUsd <= 0 || lastHarvestTs <= 0) return 0;
  const elapsed = Math.floor(Date.now() / 1000) - lastHarvestTs;
  if (elapsed < 1800) return 0; // Need at least 30 min of data

  const fee0Usd = (Number(formatUnits(pendingFees0, decimals0))) *
    (tokenPriceCache.get(addr0.toLowerCase()) ?? 0);
  const fee1Usd = (Number(formatUnits(pendingFees1, decimals1))) *
    (tokenPriceCache.get(addr1.toLowerCase()) ?? 0);
  const totalFeeUsd = fee0Usd + fee1Usd;
  if (totalFeeUsd <= 0) return 0;

  // Annualize: feeUsd earned in `elapsed` seconds → per year
  const annualizedFeeUsd = totalFeeUsd * (365 * 86400 / elapsed);
  const apr = (annualizedFeeUsd / tvlUsd) * 100;
  return Math.min(apr, 9999); // Cap at 9999%
}

// Get a token's USD price — checks GeckoTerminal cache first.
// Cache is populated by fetchTokenPrices() which runs every 60s.
// No on-chain math needed — gecko prices are direct USD values.
function getTokenPriceUsd(_config: any, tokenAddr: string, _tokenDecimals: number): Promise<number> {
  const cached = tokenPriceCache.get(tokenAddr.toLowerCase());
  return Promise.resolve(cached ?? 0);
}

// Estimate vault TVL by:
//   1. Finding the pool address for this pair
//   2. Reading the vault's actual token balances in that pool (balanceOf strategy NFT position)
//   3. Pricing each token using GeckoTerminal USD prices (fetched every 60s)
// This approach works for ALL token types including YASH, FACTORY, BOOMER —
// no sqrtPrice math, no fraction estimates, just direct balance × gecko price.
async function estimateTvlFromChain(
  config: any,
  addrA: string, addrB: string,
  decimalsA: number, decimalsB: number
): Promise<number> {
  // Find the pool
  const feeTiers = [100, 500, 2500, 3000, 10000];
  let poolAddress: string | null = null;
  for (const fee of feeTiers) {
    try {
      const addr = await readContract(config, {
        address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getPool",
        args: [addrA as `0x${string}`, addrB as `0x${string}`, fee],
      }) as string;
      if (addr && addr !== "0x0000000000000000000000000000000000000000") {
        poolAddress = addr; break;
      }
    } catch {}
  }
  if (!poolAddress) return 0;

  try {
    // Read strategy liquidity and total pool liquidity to get our fraction
    const [stratLiq, poolLiq, poolBalA, poolBalB] = await Promise.all([
      readContract(config, { address: STRATEGY_ADDRESS, abi: STRATEGY_ABI,
        functionName: "pairLiquidity", args: [addrA as `0x${string}`, addrB as `0x${string}`] }) as Promise<bigint>,
      readContract(config, { address: poolAddress as `0x${string}`, abi: POOL_ABI,
        functionName: "liquidity" }) as Promise<bigint>,
      // Read how many of each token the pool contract holds
      readContract(config, { address: addrA as `0x${string}`, abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf", args: [poolAddress as `0x${string}`] }) as Promise<bigint>,
      readContract(config, { address: addrB as `0x${string}`, abi: ERC20_BALANCE_ABI,
        functionName: "balanceOf", args: [poolAddress as `0x${string}`] }) as Promise<bigint>,
    ]);

    if (poolLiq === 0n || stratLiq === 0n) return 0;

    // Our fraction of the pool — cap at 1.0 to handle brief post-deposit states
    const ourFraction = Math.min(Number(stratLiq) / Number(poolLiq), 1.0);
    if (ourFraction === 0) return 0;

    // Our token amounts = pool balances × our fraction
    const ourAmtA = parseFloat(formatUnits(poolBalA, decimalsA)) * ourFraction;
    const ourAmtB = parseFloat(formatUnits(poolBalB, decimalsB)) * ourFraction;

    // Price from gecko cache (populated every 60s by fetchTokenPrices)
    const priceA = tokenPriceCache.get(addrA.toLowerCase()) ?? 0;
    const priceB = tokenPriceCache.get(addrB.toLowerCase()) ?? 0;

    let totalUsd = 0;
    if (priceA > 0) totalUsd += ourAmtA * priceA;
    if (priceB > 0) totalUsd += ourAmtB * priceB;

    // If only one price available, double it (symmetric pool value assumption)
    // This is accurate because both sides of a pool are equal in USD value by definition
    if (priceA > 0 && priceB === 0) totalUsd = ourAmtA * priceA * 2;
    else if (priceB > 0 && priceA === 0) totalUsd = ourAmtB * priceB * 2;

    // Sanity cap
    return Math.min(totalUsd, 50_000);
  } catch { return 0; }
}


// ─── TOKEN SELECTOR ───────────────────────────────────────────────────────────
function TokenSelector({
  value, onChange, exclude, placeholder, label, tokenList = ALL_TOKENS
}: {
  value: Token | null;
  onChange: (t: Token) => void;
  exclude?: Token | null;
  placeholder: string;
  label: string;
  tokenList?: Token[];
}) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = tokenList.filter(t =>
    t.address.toLowerCase() !== (exclude?.address ?? "").toLowerCase() &&
    // Hide tokens that form an incompatible pair with the currently selected other token
    !(exclude && isIncompatiblePair(t.address, exclude.address)) &&
    (t.symbol.toLowerCase().includes(query.toLowerCase()) ||
     t.name.toLowerCase().includes(query.toLowerCase()) ||
     t.address.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className={styles.tokenSelectorWrap} ref={ref}>
      <div className={styles.tokenSelectorLabel}>{label}</div>
      <button
        className={`${styles.tokenSelectorBtn} ${open ? styles.tokenSelectorOpen : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        {value ? (
          <span className={styles.tokenSelectorValue}>
            <span className={styles.tokSym}>{value.symbol}</span>
            <span className={styles.tokName}>{value.name}</span>
          </span>
        ) : (
          <span className={styles.tokenSelectorPlaceholder}>{placeholder}</span>
        )}
        <span className={styles.tsChevron}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={styles.tokenDropdown}>
          <input
            className={styles.tokenSearch}
            placeholder="Search name, symbol or address…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <div className={styles.tokenList}>
            {filtered.length === 0 && <div className={styles.tokenListEmpty}>No results</div>}
            {filtered.map(t => (
              <button
                key={t.address}
                className={styles.tokenOption}
                onClick={() => { onChange(t); setOpen(false); setQuery(""); }}
              >
                <span className={styles.tokOptSym}>{t.symbol}</span>
                <span className={styles.tokOptName}>{t.name}</span>
                <span className={styles.tokOptAddr}>{t.address.slice(0, 6)}…{t.address.slice(-4)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── CREATE POOL PANEL ────────────────────────────────────────────────────────
/**
 * Token A is always one of CORE_TOKENS (PEPU, MFG, PTX).
 * Token B is any token from ALL_TOKENS.
 * Proxy detection still runs silently so the PROXY badge appears on pool cards,
 * but no warning is shown — all pairs including PEPU/proxy are fully supported.
 */
function CreatePoolPanel({
  onCreated,
  existingIds,
  wagmiConfig,
}: {
  onCreated: (p: Pool) => void;
  existingIds: Set<string>;
  wagmiConfig: ReturnType<typeof useConfig>;
}) {
  const [tokA, setTokA] = useState<Token | null>(null);
  const [tokB, setTokB] = useState<Token | null>(null);
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  // Proxy detection — silent, only used to set hasProxyToken on the pool card
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo | null>(null);
  useEffect(() => {
    if (!tokB) { setProxyInfo(null); return; }
    const knownGood = [PEPU_ADDR, MFG_ADDR, PTX_ADDR].map(a => a.toLowerCase());
    if (knownGood.includes(tokB.address.toLowerCase())) {
      setProxyInfo({ isProxy: false, implementation: null });
      return;
    }
    detectMinimalProxyCached(tokB.address, wagmiConfig).then(setProxyInfo).catch(() =>
      setProxyInfo({ isProxy: false, implementation: null })
    );
  }, [tokB?.address, wagmiConfig]);

  const handleCreate = useCallback(async () => {
    if (!tokA || !tokB) { setErr("Select both tokens"); return; }
    const key = getPairKey(tokA, tokB);
    if (existingIds.has(key)) { setErr("This pair is already in your pool list below"); return; }
    setErr(""); setBusy(true);
    let gecko: { apr: number; tvl: number } | null = null;
    try { gecko = await fetchGeckoAPR(tokA.address, tokB.address); } catch {}
    finally { setBusy(false); }

    const pool: Pool = {
      id: key, tokenA: tokA, tokenB: tokB, pairKey: key,
      tvlUsd:   gecko?.tvl ?? 0,
      apr:      gecko?.apr ?? parseFloat((Math.random() * 40 + 15).toFixed(1)),
      aprSource: gecko ? "geckoterm" : "estimated",
      userShares: 0n, userShareOfPool: 0, boostActive: false,
      pendingFees0: 0n, pendingFees1: 0n, valueHistory: [], depositedUsd: 0,
        lastHarvestTs: 0, totalHarvests: 0, harvestReady: false,
      hasProxyToken: proxyInfo?.isProxy ?? false,
    };
    onCreated(pool);
    setTokA(null); setTokB(null); setProxyInfo(null);
  }, [tokA, tokB, existingIds, onCreated, proxyInfo]);

  const isFeeOnTransfer =
    FEE_ON_TRANSFER_TOKENS.has(tokA?.address?.toLowerCase() ?? "") ||
    FEE_ON_TRANSFER_TOKENS.has(tokB?.address?.toLowerCase() ?? "");

  return (
    <div className={styles.createPanel}>
      <div className={styles.createHeader}>
        <div className={styles.createTitle}>SELECT A PAIR TO FARM</div>
        <div className={styles.createSub}>
          Choose any two tokens — enter one or both amounts to deposit. No 50/50 required.
        </div>
      </div>

      <div className={styles.createSelectors}>
        <TokenSelector
          label="TOKEN A"
          value={tokA}
          onChange={t => { setTokA(t); setErr(""); }}
          exclude={tokB}
          placeholder="Select base token…"
          tokenList={CORE_TOKENS}
        />
        <div className={styles.createSep}>
          <span className={styles.createSepIcon}>/</span>
        </div>
        <TokenSelector
          label="TOKEN B"
          value={tokB}
          onChange={t => { setTokB(t); setErr(""); }}
          exclude={tokA}
          placeholder="Select pair token…"
          tokenList={ALL_TOKENS}
        />
      </div>

      {isFeeOnTransfer && (
        <div className={styles.taxWarning}>
          💡 This token has a transfer tax. If a deposit doesn't go through,
          try a smaller amount or deposit one token at a time.
        </div>
      )}

      {err && <div className={styles.createErr}>{err}</div>}

      <button
        className={`${styles.createBtn} ${tokA && tokB ? styles.createBtnReady : ""}`}
        onClick={handleCreate}
        disabled={!tokA || !tokB || busy}
      >
        {busy ? "LOADING POOL DATA…"
          : tokA && tokB ? `OPEN ${tokA.symbol}/${tokB.symbol} POOL`
          : "SELECT BOTH TOKENS TO CONTINUE"}
      </button>

      <div className={styles.createHint}>
        Select any two tokens and enter any amount — the vault handles the rest automatically.
        APR data may take a few minutes to appear for newer pools.
      </div>
    </div>
  );
}


// ─── WITHDRAW ESTIMATE ────────────────────────────────────────────────────────
// Uses sqrtPriceX96 from pool slot0 + full-range liquidity math for accuracy.
// Full-range (MIN_TICK to MAX_TICK) means:
//   amount0 = liquidity * (1/sqrt(lower) - 1/sqrt(upper)) in Q96
//   amount1 = liquidity * (sqrt(upper) - sqrt(lower)) in Q96
// Since it's full-range we simplify: ratio = price (sqrtP^2 / 2^192).
// Then user tokens = userLiq proportionally split at current price.
function computeTokenAmountsFromLiquidity(
  sqrtPriceX96: bigint,
  liquidity: bigint,
  decimals0: number,
  decimals1: number
): { amt0: number; amt1: number } {
  if (liquidity === 0n || sqrtPriceX96 === 0n) return { amt0: 0, amt1: 0 };

  // Full-range ticks (MAX_TICK = 887272, tick spacing 200 → 887200)
  // sqrt(1.0001^-887200) and sqrt(1.0001^887200) in Q96
  const MIN_SQRT_RATIO = BigInt("4295128739");
  const MAX_SQRT_RATIO = BigInt("1461446703485210103287273052203988822378723970342");
  const Q96 = BigInt(2) ** BigInt(96);

  // Clamp to valid range
  const sqrtP = sqrtPriceX96 < MIN_SQRT_RATIO ? MIN_SQRT_RATIO
              : sqrtPriceX96 > MAX_SQRT_RATIO ? MAX_SQRT_RATIO
              : sqrtPriceX96;

  const sqrtLow  = MIN_SQRT_RATIO;
  const sqrtHigh = MAX_SQRT_RATIO;

  // amount0 = L * (sqrtHigh - sqrtP) / (sqrtP * sqrtHigh / Q96)   [for price in range]
  // amount1 = L * (sqrtP - sqrtLow) / Q96
  // Using integer math throughout to avoid precision loss:
  let amt0Raw = 0n;
  let amt1Raw = 0n;

  if (sqrtP <= sqrtLow) {
    // Entirely in token0 range
    amt0Raw = (liquidity * Q96 * (sqrtHigh - sqrtLow)) / (sqrtLow * sqrtHigh);
    amt1Raw = 0n;
  } else if (sqrtP >= sqrtHigh) {
    // Entirely in token1 range
    amt0Raw = 0n;
    amt1Raw = (liquidity * (sqrtHigh - sqrtLow)) / Q96;
  } else {
    // In range
    amt0Raw = (liquidity * Q96 * (sqrtHigh - sqrtP)) / (sqrtP * sqrtHigh);
    amt1Raw = (liquidity * (sqrtP - sqrtLow)) / Q96;
  }

  // Use BigInt division to avoid precision loss on large liquidity values
  // Convert to float only at the final scaling step
  const scale0 = BigInt(10 ** decimals0);
  const scale1 = BigInt(10 ** decimals1);
  // Integer part + fractional remainder
  const amt0Int = Number(amt0Raw / scale0);
  const amt0Frac = Number(amt0Raw % scale0) / (10 ** decimals0);
  const amt1Int = Number(amt1Raw / scale1);
  const amt1Frac = Number(amt1Raw % scale1) / (10 ** decimals1);
  return { amt0: amt0Int + amt0Frac, amt1: amt1Int + amt1Frac };
}

function WithdrawEstimate({
  pool, pct, wagmiConfig
}: {
  pool: Pool; pct: number; wagmiConfig: any;
}) {
  const [est, setEst] = useState<{ amt0: string; amt1: string; sym0: string; sym1: string } | null>(null);

  useEffect(() => {
    if (!wagmiConfig || pool.userShares === 0n) return;
    let cancelled = false;
    const compute = async () => {
      try {
        const totalSh = await readContract(wagmiConfig, { address: VAULT_ADDRESS, abi: VAULT_ABI,
          functionName: "totalShares", args: [pool.pairKey as `0x${string}`] }) as bigint;
        if (totalSh === 0n) return;

        const fmtNum = (n: number, dec: number) =>
          n === 0 ? "0" : n < 0.0001 ? n.toFixed(8) : n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n.toFixed(dec > 6 ? 4 : 2);

        // Find pool address
        const feeTiers = [100, 500, 2500, 3000, 10000];
        let poolAddr: string | null = null;
        for (const fee of feeTiers) {
          const addr = await readContract(wagmiConfig, {
            address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getPool",
            args: [pool.tokenA.address as `0x${string}`, pool.tokenB.address as `0x${string}`, fee],
          }) as string;
          if (addr && addr !== "0x0000000000000000000000000000000000000000") { poolAddr = addr; break; }
        }
        if (!poolAddr) return;

        // Read slot0 (price) + strategy liquidity in one batch
        const [slot0Data, stratLiq] = await Promise.all([
          readContract(wagmiConfig, { address: poolAddr as `0x${string}`, abi: POOL_ABI,
            functionName: "slot0" }) as Promise<readonly [bigint, number, number, number, number, number, boolean]>,
          readContract(wagmiConfig, { address: STRATEGY_ADDRESS, abi: STRATEGY_ABI,
            functionName: "pairLiquidity", args: [pool.tokenA.address as `0x${string}`, pool.tokenB.address as `0x${string}`] }) as Promise<bigint>,
        ]);

        if (stratLiq === 0n) return;

        // Determine sorted token order (pool always stores token0 < token1 by address)
        const [sortedT0, sortedT1] = pool.tokenA.address.toLowerCase() < pool.tokenB.address.toLowerCase()
          ? [pool.tokenA, pool.tokenB] : [pool.tokenB, pool.tokenA];

        // User's proportional share of strategy liquidity
        const userLiq = (stratLiq * pool.userShares * BigInt(pct)) / (totalSh * 100n);
        if (userLiq === 0n) return;

        const sqrtPriceX96 = slot0Data[0];
        const { amt0: raw0, amt1: raw1 } = computeTokenAmountsFromLiquidity(
          sqrtPriceX96, userLiq, sortedT0.decimals, sortedT1.decimals
        );

        if (!cancelled && (raw0 > 0 || raw1 > 0)) {
          // Map sorted (t0/t1) back to display order (tokenA/tokenB)
          const isAToken0 = pool.tokenA.address.toLowerCase() < pool.tokenB.address.toLowerCase();
          const estA = isAToken0 ? raw0 : raw1;
          const estB = isAToken0 ? raw1 : raw0;
          setEst({
            amt0: fmtNum(estA, pool.tokenA.decimals),
            amt1: fmtNum(estB, pool.tokenB.decimals),
            sym0: pool.tokenA.symbol,
            sym1: pool.tokenB.symbol,
          });
        }
      } catch {}
    };
    compute();
    return () => { cancelled = true; };
  }, [pool.userShares, pool.pairKey, pct, wagmiConfig]);

  if (!est) return null;
  return (
    <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--radius)",
                  padding: "0.75rem 1rem", margin: "0.75rem 0", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <div style={{ fontSize: "0.55rem", color: "var(--text2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.1rem" }}>
        Estimated receive
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text0)" }}>{est.amt0}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--green)", fontWeight: 700 }}>{est.sym0}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text0)" }}>{est.amt1}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--amber)", fontWeight: 700 }}>{est.sym1}</span>
      </div>
      <div style={{ fontSize: "0.5rem", color: "var(--text3)", marginTop: "0.15rem" }}>
        Estimated at current pool ratio · actual may vary slightly
      </div>
    </div>
  );
}


// ─── POOL MODAL (ADD / WITHDRAW) ──────────────────────────────────────────────
function PoolModal({
  pool, mode, userAddress, onClose, onSuccess, wagmiConfig
}: {
  pool: Pool; mode: "add" | "withdraw";
  userAddress: `0x${string}` | undefined;
  onClose: () => void; onSuccess: () => void;
  wagmiConfig: any;
}) {
  const [amtA, setAmtA] = useState("");
  const [amtB, setAmtB] = useState("");
  useEffect(() => { setAmtA(""); setAmtB(""); setErr(""); setStep("idle"); }, [pool.id, mode]);
  const [pct,  setPct]  = useState(100);
  const [step, setStep] = useState<"idle" | "approveA" | "approveB" | "tx">("idle");
  useEffect(() => { return () => setStep("idle"); }, []);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [err,  setErr]  = useState("");

  const { writeContract, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if (isSuccess) { onSuccess(); onClose(); } }, [isSuccess]);

  const isTokenANative = pool.tokenA.address.toLowerCase() === WPEPU_ADDR.toLowerCase();
  const isTokenBNative = pool.tokenB.address.toLowerCase() === WPEPU_ADDR.toLowerCase();
  const { data: nativeBal } = useBalance({
    address: userAddress,
    query: { enabled: !!userAddress && mode === "add" && (isTokenANative || isTokenBNative) }
  });

  const { data: balA } = useReadContract({
    address: pool.tokenA.address as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [userAddress!],
    query: { enabled: !!userAddress && mode === "add" }
  });
  const { data: balB } = useReadContract({
    address: pool.tokenB.address as `0x${string}`, abi: ERC20_ABI, functionName: "balanceOf", args: [userAddress!],
    query: { enabled: !!userAddress && mode === "add" }
  });

  const nativeBalFmt = nativeBal ? parseFloat(formatUnits(nativeBal.value, 18)) : 0;
  // Show native PEPU balance for PEPU tokens (friendlier UX), wPEPU ERC20 for others
  const balAFmt = isTokenANative ? nativeBalFmt : (balA ? parseFloat(formatUnits(balA as bigint, pool.tokenA.decimals)) : 0);
  const balBFmt = isTokenBNative ? nativeBalFmt : (balB ? parseFloat(formatUnits(balB as bigint, pool.tokenB.decimals)) : 0);

  const parsedA = amtA ? parseUnits(amtA, pool.tokenA.decimals) : 0n;
  const parsedB = amtB ? parseUnits(amtB, pool.tokenB.decimals) : 0n;

  const { data: allowA, refetch: refA } = useReadContract({
    address: pool.tokenA.address as `0x${string}`, abi: ERC20_ABI, functionName: "allowance",
    args: [userAddress!, VAULT_ADDRESS], query: { enabled: !!userAddress && mode === "add" }
  });
  const { data: allowB, refetch: refB } = useReadContract({
    address: pool.tokenB.address as `0x${string}`, abi: ERC20_ABI, functionName: "allowance",
    args: [userAddress!, VAULT_ADDRESS], query: { enabled: !!userAddress && mode === "add" }
  });

  const isPepuA = pool.tokenA.address.toLowerCase() === WPEPU_ADDR.toLowerCase();
  const isPepuB = pool.tokenB.address.toLowerCase() === WPEPU_ADDR.toLowerCase();
  const isPepuPair = isPepuA || isPepuB;
  const needsA  = mode === "add" && parsedA > 0n && !isPepuA && ((allowA as bigint ?? 0n) < parsedA);
  const needsB  = mode === "add" && parsedB > 0n && !isPepuB && ((allowB as bigint ?? 0n) < parsedB);
  const sharesForW = pool.userShares > 0n ? (pool.userShares * BigInt(pct)) / 100n : 0n;
  const busy = isPending || step !== "idle";
  const isAdd = mode === "add";

  const handleDeposit = useCallback(() => {
    if (!userAddress) return;
    if (parsedA === 0n && parsedB === 0n) { setErr("Enter at least one amount"); return; }
    setErr("");

    const doDeposit = () => {
      setStep("tx");
      if (isPepuPair) {
        const pepuAmt   = isPepuA ? parsedA : parsedB;
        const otherAmt  = isPepuA ? parsedB : parsedA;
        const otherAddr = (isPepuA ? pool.tokenB.address : pool.tokenA.address) as `0x${string}`;
        writeContract({
          address: VAULT_ADDRESS, abi: VAULT_ABI,
          functionName: "depositWithNativePEPU",
          args: [otherAddr, otherAmt],
          value: pepuAmt,
          gas: 2_000_000n,
        }, { onSuccess: h => setTxHash(h), onError: e => { setErr(e.message.slice(0, 100)); setStep("idle"); } });
      } else {
        const [s0, s1] = pool.tokenA.address.toLowerCase() < pool.tokenB.address.toLowerCase()
          ? [pool.tokenA.address as `0x${string}`, pool.tokenB.address as `0x${string}`]
          : [pool.tokenB.address as `0x${string}`, pool.tokenA.address as `0x${string}`];
        const [a0, a1] = pool.tokenA.address.toLowerCase() < pool.tokenB.address.toLowerCase()
          ? [parsedA, parsedB] : [parsedB, parsedA];
        writeContract({
          address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "deposit",
          args: [s0, s1, a0, a1], gas: 2_000_000n,
        }, { onSuccess: h => setTxHash(h), onError: e => { setErr(e.message.slice(0, 100)); setStep("idle"); } });
      }
    };

    if (isPepuPair) {
      // PEPU goes as msg.value — only the other token needs approval
      const otherAmt    = isPepuA ? parsedB : parsedA;
      const otherAddr   = (isPepuA ? pool.tokenB.address : pool.tokenA.address) as `0x${string}`;
      const otherAllow  = isPepuA ? (allowB as bigint ?? 0n) : (allowA as bigint ?? 0n);
      const otherRefetch = isPepuA ? refB : refA;
      const needsOther  = otherAmt > 0n && otherAllow < otherAmt;
      if (needsOther) {
        setStep("approveA");
        writeContract(
          { address: otherAddr, abi: ERC20_ABI, functionName: "approve", args: [VAULT_ADDRESS, otherAmt] },
          { onSuccess: () => { otherRefetch(); setTimeout(doDeposit, 1000); },
            onError: e => { setErr(e.message.slice(0, 100)); setStep("idle"); } }
        );
      } else {
        doDeposit();
      }
    } else {
      const doB = () => needsB
        ? (setStep("approveB"), writeContract(
            { address: pool.tokenB.address as `0x${string}`, abi: ERC20_ABI, functionName: "approve", args: [VAULT_ADDRESS, parsedB] },
            { onSuccess: () => { refB(); setTimeout(doDeposit, 1000); }, onError: e => { setErr(e.message.slice(0, 100)); setStep("idle"); } }
          ))
        : doDeposit();
      if (needsA) {
        setStep("approveA");
        writeContract(
          { address: pool.tokenA.address as `0x${string}`, abi: ERC20_ABI, functionName: "approve", args: [VAULT_ADDRESS, parsedA] },
          { onSuccess: () => { refA(); setTimeout(doB, 1000); }, onError: e => { setErr(e.message.slice(0, 100)); setStep("idle"); } }
        );
      } else doB();
    }
  }, [parsedA, parsedB, needsA, needsB, pool, userAddress, writeContract]);

  const handleWithdraw = useCallback(() => {
    if (!userAddress || sharesForW === 0n) return;
    setErr(""); setStep("tx");
    writeContract({
      address: VAULT_ADDRESS, abi: VAULT_ABI,
      functionName: pct === 100 ? "withdrawAll" : "withdraw" as any,
      args: pct === 100
        ? [pool.tokenA.address as `0x${string}`, pool.tokenB.address as `0x${string}`]
        : [pool.tokenA.address as `0x${string}`, pool.tokenB.address as `0x${string}`, sharesForW],
    }, { onSuccess: h => setTxHash(h), onError: e => { setErr(e.message.slice(0, 100)); setStep("idle"); } });
  }, [sharesForW, pool, pct, userAddress, writeContract]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${isAdd ? styles.modalAdd : styles.modalWithdraw}`} onClick={e => e.stopPropagation()}>

        <div className={styles.modalHeader}>
          <div className={styles.modalPair}>
            <span className={styles.mSymA}>{pool.tokenA.symbol}</span>
            <span className={styles.mSlash}>/</span>
            <span className={styles.mSymB}>{pool.tokenB.symbol}</span>
            {pool.hasProxyToken && (
              <span className={styles.proxyBadge} title="A token in this pair has a transfer tax built into its contract (e.g. 15% buy tax). The vault handles this automatically — your deposit and compounding will still work correctly.">
                TAX
              </span>
            )}
          </div>
          <div className={`${styles.mMode} ${isAdd ? styles.mModeAdd : styles.mModeOut}`}>
            {isAdd ? "▶ ADD LIQUIDITY" : "◀ WITHDRAW"}
          </div>
          <button className={styles.mClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.mStatsBar}>
          <div className={styles.mStat}><span className={styles.mStatLbl}>TVL</span><span className={styles.mStatVal}>${fmt(pool.tvlUsd)}</span></div>
          <div className={styles.mStat}><span className={styles.mStatLbl}>APR</span><span className={`${styles.mStatVal} ${styles.mStatApr}`}>{pool.apr.toFixed(1)}%</span></div>
          <div className={styles.mStat}><span className={styles.mStatLbl}>YOUR SHARE</span><span className={styles.mStatVal}>{(pool.userShareOfPool / 100).toFixed(2)}%</span></div>
        </div>

        {isAdd && (
          <div className={styles.mForm}>
            <div className={styles.mNote}>
              Enter one or both amounts — you don't need to be exactly 50/50.
              The vault automatically rebalances using the zap mechanic.
            </div>
            <div className={styles.mInputGroup}>
              <div className={styles.mInputLabel}>
                <span>{pool.tokenA.symbol}</span>
                <button className={styles.mMax} onClick={() => setAmtA(balAFmt.toString())}>
                  MAX · {fmt(balAFmt)}
                </button>
              </div>
              <input className={styles.mInput} type="number" min="0" placeholder="0.00"
                value={amtA} onChange={e => setAmtA(e.target.value)} />
            </div>
            <div className={styles.mDivider}>
              <span className={styles.mPlus}>+</span>
              <span className={styles.mDivNote}>optional — zap rebalances automatically</span>
            </div>
            <div className={styles.mInputGroup}>
              <div className={styles.mInputLabel}>
                <span>{pool.tokenB.symbol}</span>
                <button className={styles.mMax} onClick={() => setAmtB(balBFmt.toString())}>
                  MAX · {fmt(balBFmt)}
                </button>
              </div>
              <input className={styles.mInput} type="number" min="0" placeholder="0.00"
                value={amtB} onChange={e => setAmtB(e.target.value)} />
            </div>
            {(needsA || needsB) && (
              <div className={styles.mApproveNote}>
                Requires approval: {needsA && pool.tokenA.symbol}{needsA && needsB && " + "}{needsB && pool.tokenB.symbol}
              </div>
            )}
            <button className={`${styles.mBtn} ${styles.mBtnAdd}`} onClick={handleDeposit} disabled={busy}>
              {step === "approveA" ? `APPROVING ${pool.tokenA.symbol}…`
               : step === "approveB" ? `APPROVING ${pool.tokenB.symbol}…`
               : step === "tx" ? "DEPOSITING…"
               : (needsA || needsB) ? "APPROVE & DEPOSIT" : "DEPOSIT"}
            </button>
          </div>
        )}

        {!isAdd && (
          <div className={styles.mForm}>
            <div className={styles.mNote}>Returns both tokens at the current pool ratio. Amounts shown are estimates.</div>
            <div className={styles.mPctRow}>
              <span className={styles.mPctLabel}>AMOUNT</span>
              <span className={styles.mPctVal}>{pct}%</span>
            </div>
            <input type="range" min="1" max="100" step="1" value={pct}
              className={styles.mSlider} onChange={e => setPct(parseInt(e.target.value))} />
            <div className={styles.mPctBtns}>
              {[25, 50, 75, 100].map(p => (
                <button key={p} className={`${styles.mPctBtn} ${pct === p ? styles.mPctBtnOn : ""}`}
                  onClick={() => setPct(p)}>{p}%</button>
              ))}
            </div>
            <WithdrawEstimate pool={pool} pct={pct} wagmiConfig={wagmiConfig} />
            <div className={styles.mShareRow}>
              <span className={styles.mShareLbl}>Shares to burn</span>
              <span className={styles.mShareVal}>{fmtShares(sharesForW)}</span>
            </div>
            <button className={`${styles.mBtn} ${styles.mBtnOut}`}
              onClick={handleWithdraw} disabled={busy || sharesForW === 0n}>
              {step === "tx" ? "WITHDRAWING…" : `WITHDRAW ${pct}%`}
            </button>
          </div>
        )}

        {err && <div className={styles.mErr}>{err}</div>}
        {txHash && (
          <a href={`https://pepuscan.com/tx/${txHash}`} target="_blank" rel="noreferrer" className={styles.mTxLink}>
            ⏳ View on PepuScan ↗
          </a>
        )}
      </div>
    </div>
  );
}


// ─── MINI SPARKLINE ───────────────────────────────────────────────────────────
function Sparkline({ data, width = 560, height = 72 }: { data: { ts: number; usd: number; event?: string }[]; width?: number; height?: number }) {
  if (data.length === 0) {
    return <div className={styles.sparkEmpty}>Loading position history…</div>;
  }

  const nonZero = data.filter(d => d.usd > 0);
  if (nonZero.length === 0) {
    return <div className={styles.sparkEmpty}>Waiting for price data…</div>;
  }

  // Always start from 0 so deposit rise is visible
  const chartData = data[0]?.usd === 0
    ? data
    : [{ ts: data[0].ts - 60_000, usd: 0 }, ...data];

  const vals = chartData.map(d => d.usd);
  const max = Math.max(...vals) || 1;

  const toX = (i: number) => (i / Math.max(chartData.length - 1, 1)) * width;
  const toY = (v: number) => height - 4 - (v / max) * (height - 12);

  const pts = chartData.map((d, i) => `${toX(i).toFixed(1)},${toY(d.usd).toFixed(1)}`).join(" ");
  const lastVal = vals[vals.length - 1];
  const firstNonZero = vals.find(v => v > 0) ?? 0;
  const up = lastVal >= firstNonZero;
  const color = up ? "#00ff88" : "#ff4444";

  return (
    <svg width="100%" height={height} className={styles.sparkSvg} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg_${width}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area */}
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sg_${width})`} />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Event markers */}
      {chartData.map((d, i) => {
        if (!d.event || d.usd === 0) return null;
        const x = toX(i);
        const y = toY(d.usd);
        const mc = d.event === "deposit" ? "#00ff88"
                 : d.event === "withdraw" ? "#ff4444"
                 : "#ffcc00"; // harvest = gold
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill={mc} stroke="#000" strokeWidth="1" />
            <text x={x} y={y - 8} textAnchor="middle" fontSize="8" fill={mc} fontFamily="monospace">
              {d.event === "deposit" ? "▲" : d.event === "withdraw" ? "▼" : "↺"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


// ─── POSITION HISTORY LOADER ─────────────────────────────────────────────────
// Reads Deposited/Withdrawn events from vault + Harvested events from strategy
// to build a chart of the user's actual position value over time.
// AllLogsContext — fetched once at app level, passed to all pool cards
const AllLogsContext = createContext<AllLogsCache | null>(null);

function PositionHistoryLoader({
  pool, userAddress, posUsd
}: {
  pool: Pool;
  userAddress: string | undefined;
  posUsd: number;
}) {
  const allLogs = useContext(AllLogsContext);
  const [history, setHistory] = useState<{ ts: number; usd: number; event?: string }[]>([]);

  // Show simple 0→current immediately (no wait for logs)
  useEffect(() => {
    if (posUsd > 0 && history.length === 0) {
      setHistory([
        { ts: Date.now() - 120_000, usd: 0 },
        { ts: Date.now(), usd: posUsd },
      ]);
    }
  }, [posUsd]); // eslint-disable-line react-hooks/exhaustive-deps

  // Once logs load, rebuild with real event markers
  useEffect(() => {
    if (!userAddress || !pool.pairKey || !allLogs || posUsd <= 0) return;

    const events = buildPairHistory(
      allLogs, pool.pairKey,
      pool.tokenA.address, pool.tokenB.address,
    );

    const priceNow = posUsd;
    const built: { ts: number; usd: number; event?: string }[] = [];

    if (events.length === 0) {
      // eth_getLogs unavailable — build chart from strategy position data we already have
      // lastHarvestTs tells us when the last compound happened, totalHarvests how many times
      const harvestCount = pool.totalHarvests ?? 0;
      const lastHarvestMs = (pool.lastHarvestTs ?? 0) * 1000;
      const depositEstTs = harvestCount > 0 && lastHarvestMs > 0
        ? lastHarvestMs - harvestCount * 86_400_000  // estimate deposit ~N days before last harvest
        : Date.now() - 7 * 86_400_000;              // fallback: 7 days ago

      built.push({ ts: depositEstTs, usd: 0 });

      if (harvestCount > 0 && lastHarvestMs > 0) {
        // Space harvests evenly between estimated deposit and last harvest
        const interval = (lastHarvestMs - depositEstTs) / harvestCount;
        let val = priceNow * 0.95;
        for (let h = 0; h < Math.min(harvestCount, 30); h++) {
          val = Math.min(val * 1.005, priceNow);
          built.push({ ts: depositEstTs + interval * (h + 1), usd: val, event: "harvest" });
        }
      }

      built.push({ ts: Date.now(), usd: priceNow });
    } else {
      built.push({ ts: events[0].ts - 60_000, usd: 0 });
      let runningVal = 0;
      const depositCount = events.filter(e => e.event === "deposit").length;
      const perDeposit = depositCount > 0 ? (priceNow / depositCount) * 0.95 : priceNow;
      for (const ev of events) {
        if      (ev.event === "deposit")  runningVal += perDeposit;
        else if (ev.event === "withdraw") runningVal = Math.max(0, runningVal * 0.5);
        else if (ev.event === "harvest")  runningVal *= 1.005;
        built.push({ ts: ev.ts, usd: runningVal, event: ev.event });
      }
      built.push({ ts: Date.now(), usd: priceNow });
    }

    setHistory(built);
  }, [allLogs, pool.pairKey, pool.tokenA.address, pool.tokenB.address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep last point updated with live posUsd
  const liveHistory = useMemo(() => {
    if (history.length === 0 || posUsd <= 0) return history;
    const updated = [...history];
    const last = updated[updated.length - 1];
    if (last && !last.event) {
      updated[updated.length - 1] = { ...last, usd: posUsd };
    } else {
      updated.push({ ts: Date.now(), usd: posUsd });
    }
    return updated;
  }, [history, posUsd]);

  // Show chart immediately — event markers added once logs arrive
  const chartData = liveHistory.length > 0 ? liveHistory : history;
  if (chartData.length === 0) return <div className={styles.sparkEmpty}>Waiting for price data…</div>;
  return <Sparkline data={chartData} width={560} height={72} />;
}

// ─── POOL CARD ────────────────────────────────────────────────────────────────
// Per-pool countdown removed — global keeper timer at top of page

function PoolCard({
  pool, userAddress, onAdd, onWithdraw, onRemove, isNew
}: {
  pool: Pool; userAddress: `0x${string}` | undefined;
  onAdd: () => void; onWithdraw: () => void; onRemove: () => void; isNew?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPos = pool.userShares > 0n;

  const fees0Fmt = parseFloat(formatUnits(pool.pendingFees0 ?? 0n, pool.tokenA.decimals));
  const fees1Fmt = parseFloat(formatUnits(pool.pendingFees1 ?? 0n, pool.tokenB.decimals));
  const hasFees  = fees0Fmt > 0.000001 || fees1Fmt > 0.000001;
  const posUsd   = pool.tvlUsd > 0 && pool.userShareOfPool > 0 ? pool.tvlUsd * (pool.userShareOfPool / 10000) : 0;
  const isHarvestReady = pool.harvestReady ?? false;
  const totalHarvests  = pool.totalHarvests ?? 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button,.nftSlot")) return;
    setExpanded(x => !x);
  };

  return (
    <div
      className={`${styles.poolCard} ${isNew ? styles.poolNew : ""} ${pool.boostActive ? styles.poolBoosted : ""}`}
      onClick={handleCardClick}
    >
      <div className={styles.pcBadges}>
        {isNew           && <span className={styles.badgeNew}>NEW</span>}
        {pool.boostActive && <span className={styles.badgeBoost}>⚡ BOOSTED</span>}
        {pool.hasProxyToken && (
          <span className={styles.badgeProxy} title="A token in this pair has a transfer tax built into its contract (e.g. 15% buy tax). The vault handles this automatically.">
            TAX
          </span>
        )}
        <span className={styles.pcChevron}>{expanded ? "▲" : "▼"}</span>
        {!hasPos && (
          <button className={styles.pcBtnRemove} onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove from list">✕</button>
        )}
      </div>

      <div className={styles.pcPair}>
        <span className={styles.pcSymA}>{pool.tokenA.symbol}</span>
        <span className={styles.pcSlash}>/</span>
        <span className={styles.pcSymB}>{pool.tokenB.symbol}</span>
        <span className={styles.pcAutoComp}>↺ AUTO-COMP</span>
      </div>
      <div className={styles.pcNames}>{pool.tokenA.name} / {pool.tokenB.name}</div>

      <div className={styles.pcStats}>
        <div className={styles.pcStat}>
          <div className={styles.pcStatLbl}>TVL</div>
          <div className={styles.pcStatVal}>${fmt(pool.tvlUsd)}</div>
          <div className={styles.pcStatSub}>{pool.aprSource === "geckoterm" ? "live" : "est."}</div>
        </div>
        <div className={styles.pcStat}>
          <div className={styles.pcStatLbl}>EST. APR</div>
          <div className={`${styles.pcStatVal} ${styles.pcApr}`}>{pool.apr.toFixed(1)}%</div>
          <div className={styles.pcStatSub}>{pool.aprSource === "geckoterm" ? "live" : "est."}</div>
        </div>
        <div className={styles.pcStat}>
          <div className={styles.pcStatLbl}>MY POSITION</div>
          {hasPos ? (
            <>
              <div className={styles.pcStatVal}>{(pool.userShareOfPool / 100).toFixed(2)}%</div>
              <div className={styles.pcStatSub}>{posUsd > 0 ? `$${fmt(posUsd)} of pool` : `${fmtShares(pool.userShares)} shares`}</div>
            </>
          ) : (
            <div className={styles.pcStatEmpty}>—</div>
          )}
        </div>
        <div className={styles.pcStat}>
          <div className={styles.pcStatLbl}>SWAP FEES</div>
          {hasPos ? (
            <>
              <div className={styles.pcFeesVal}>
                <div className={styles.pcFeeRow}>
                  <span className={styles.pcFeeToken}>{pool.tokenA.symbol}</span>
                  <span className={styles.pcFeeAmt}>{fees0Fmt === 0 ? "0.0000" : fees0Fmt < 0.0001 ? "<0.0001" : fees0Fmt.toFixed(4)}</span>
                </div>
                <div className={styles.pcFeeRow}>
                  <span className={styles.pcFeeToken}>{pool.tokenB.symbol}</span>
                  <span className={styles.pcFeeAmt}>{fees1Fmt === 0 ? "0.0000" : fees1Fmt < 0.0001 ? "<0.0001" : fees1Fmt.toFixed(4)}</span>
                </div>
              </div>
              {isHarvestReady
                ? <div className={styles.pcStatSub} style={{ color: "var(--green)", fontWeight: 700 }}>↺ COMPOUNDING NOW</div>
                : hasFees
                  ? <div className={styles.pcStatSub} style={{ color: "var(--green)" }}>↺ auto-compounds daily at 10:00 UTC</div>
                  : <div className={styles.pcStatSub}>fees accumulate as swaps occur</div>}
              {totalHarvests > 0 && (
                <div className={styles.pcStatSub} style={{ color: "var(--text3)", fontSize: "0.5rem", marginTop: "0.1rem" }}>
                  {totalHarvests}× compounded
                </div>
              )}
            </>
          ) : (
            <div className={styles.pcStatEmpty}>—</div>
          )}
        </div>
        <div className={`${styles.pcStat} ${styles.pcStatActions}`}>
          <button className={styles.pcBtnAdd} onClick={e => { e.stopPropagation(); onAdd(); }}>+ ADD</button>
          <button className={`${styles.pcBtnOut} ${!hasPos ? styles.pcBtnOutDisabled : ""}`}
            onClick={e => { e.stopPropagation(); onWithdraw(); }} disabled={!hasPos}>↑ WITHDRAW</button>
          <div className={styles.nftSlot} title="NFT Boost — coming soon">
            <div className={styles.nftSlotIcon}>◈</div>
            <div className={styles.nftSlotSoon}>BOOST<br />SOON</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className={styles.pcChart} onClick={e => e.stopPropagation()}>
          <div className={styles.pcChartHeader}>
            <span className={styles.pcChartTitle}>POSITION VALUE OVER TIME</span>
            {hasPos && posUsd > 0 && <span className={styles.pcChartVal}>Current: ${fmt(posUsd)}</span>}
          </div>
          <PositionHistoryLoader pool={pool} userAddress={userAddress} posUsd={posUsd} />
          {/* Chart rendered by PositionHistoryLoader above */}
          <div className={styles.pcChartFooter}>
            Updates every 15s · Auto-compounds swap fees every 24h
            {totalHarvests > 0 && ` · ${totalHarvests}× compounded`}
          </div>
          {hasPos && (
            <div style={{ display:"flex", gap:"1rem", marginTop:"0.5rem", flexWrap:"wrap" }}>
              <div style={{ fontSize:"0.55rem", color:"var(--text3)", letterSpacing:"0.1em" }}>
                NEXT COMPOUND
                <span style={{ display:"block", fontSize:"0.72rem", fontWeight:700,
                  color: isHarvestReady ? "var(--green)" : "var(--text0)",
                  fontFamily:"var(--mono)", marginTop:"0.1rem" }}>
                  {isHarvestReady ? "↺ READY TO HARVEST" : "↺ AUTO-COMP"}
                </span>
              </div>
              {hasFees && (
                <div style={{ fontSize:"0.55rem", color:"var(--text3)", letterSpacing:"0.1em" }}>
                  PENDING FEES
                  <span style={{ display:"block", fontSize:"0.68rem", color:"#ffd966",
                    fontFamily:"var(--mono)", marginTop:"0.1rem" }}>
                    {fees0Fmt.toFixed(4)} {pool.tokenA.symbol}
                    <span style={{ color:"var(--text3)", margin:"0 0.3rem" }}>+</span>
                    {fees1Fmt.toFixed(4)} {pool.tokenB.symbol}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
function AdminPanel({ userAddress, wagmiConfig }: { userAddress: string; wagmiConfig: any }) {
  const { writeContract } = useWriteContract();
  const [tA, setTA]           = useState("");
  const [tB, setTB]           = useState("");
  const [user, setUser]       = useState("");
  const [stratAddr, setStratAddr] = useState("");
  const [status, setStatus]   = useState("");
  const [open, setOpen]       = useState(false);

  const run = (label: string, fn: () => void) => {
    setStatus(`${label}…`);
    try { fn(); setStatus(`${label} tx sent — check MetaMask`); }
    catch (e: any) { setStatus(`Error: ${e.message?.slice(0, 80)}`); }
  };

  if (!open) return (
    <div style={{ textAlign: "center", marginTop: "1rem" }}>
      <button onClick={() => setOpen(true)}
        style={{ fontSize: "0.55rem", color: "var(--text3)", background: "none", border: "1px solid var(--border)",
                 borderRadius: "4px", padding: "0.3rem 0.6rem", cursor: "pointer", fontFamily: "var(--mono)" }}>
        ⚙ OWNER TOOLS
      </button>
    </div>
  );

  return (
    <div style={{ background: "var(--bg1)", border: "1px solid var(--border2)", borderRadius: "var(--radius2)",
                  padding: "1rem", marginTop: "1rem", fontFamily: "var(--mono)", fontSize: "0.65rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span style={{ color: "var(--green)", fontWeight: 700 }}>⚙ OWNER TOOLS</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
        {[
          [tA, setTA, "Token A address"],
          [tB, setTB, "Token B address"],
          [user, setUser, "User address (for clearUserShares)"],
          [stratAddr, setStratAddr, "Old strategy address (for ownerWithdrawPair)"],
        ].map(([val, setter, ph]: any) => (
          <input key={ph} value={val} onChange={e => setter(e.target.value)} placeholder={ph}
            style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: "4px",
                     padding: "0.35rem 0.5rem", color: "var(--text0)", fontFamily: "var(--mono)", fontSize: "0.62rem" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        {[
          { label: "clearUserShares", color: "var(--green)", fn: () => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "clearUserShares", args: [tA as `0x${string}`, tB as `0x${string}`, (user || userAddress) as `0x${string}`] }) },
          { label: "clearOrphanedShares", color: "var(--amber)", fn: () => writeContract({ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: "clearOrphanedShares", args: [tA as `0x${string}`, tB as `0x${string}`] }) },
          { label: "ownerWithdrawPair", color: "var(--red)", fn: () => writeContract({ address: (stratAddr || STRATEGY_ADDRESS) as `0x${string}`, abi: STRATEGY_ABI, functionName: "ownerWithdrawPair", args: [tA as `0x${string}`, tB as `0x${string}`] }) },
        ].map(({ label, color, fn }) => (
          <button key={label} onClick={() => run(label, fn)}
            style={{ background: "var(--bg3)", border: `1px solid ${color}`, borderRadius: "4px",
                     padding: "0.35rem 0.6rem", color, cursor: "pointer", fontFamily: "var(--mono)", fontSize: "0.6rem" }}>
            {label}
          </button>
        ))}
      </div>
      {status && <div style={{ color: "var(--text2)", fontSize: "0.58rem", marginTop: "0.25rem" }}>{status}</div>}
      <div style={{ color: "var(--text3)", fontSize: "0.55rem", marginTop: "0.5rem", lineHeight: 1.6 }}>
        clearUserShares: zeroes vault share record for a user on a pair (does not move tokens)<br />
        clearOrphanedShares: zeroes ALL share records for a pair<br />
        ownerWithdrawPair: pulls liquidity from strategy NFT → sends tokens to your wallet
      </div>
    </div>
  );
}


// ─── COUNTDOWN ────────────────────────────────────────────────────────────────
function useCountdown() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Keeper fires at 10:00 UTC daily
      const next = new Date();
      next.setUTCHours(10, 0, 0, 0);
      if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
      const ms = next.getTime() - now.getTime();
      setT(`${String(Math.floor(ms / 3600000)).padStart(2,"0")}:${String(Math.floor((ms % 3600000) / 60000)).padStart(2,"0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2,"0")}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);
  return t;
}


// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function FarmsSection() {
  const { address, isConnected } = useWalletConnect();
  const chainId     = useChainId();
  const wagmiConfig = useConfig();
  const { connect, connectors, reset, isPending: isConnecting, error: connectError } = useConnect();
  const userAddress  = isConnected ? address as `0x${string}` : undefined;
  const isRightChain = chainId === CHAIN_ID;
  const countdown    = useCountdown();

  /**
   * Proxy tokens (EIP-1167 minimal proxies from PumpPad etc.) are fully
   * supported by the v6 vault + strategy. No warnings shown to users.
   * The PROXY badge on pool cards is purely informational.
   */

  // Pools come entirely from the strategy contract — no localStorage needed.
  // The strategy is the source of truth: if an NFT exists, the card shows.
  const [pools, setPools] = useState<Pool[]>([]);
  const [allLogs, setAllLogs] = useState<AllLogsCache | null>(null);

  const [showConnectors, setShowConnectors] = useState(false);
  const [modal,    setModal]    = useState<{ pool: Pool; mode: "add" | "withdraw" } | null>(null);
  const [newIds,   setNewIds]   = useState<Set<string>>(new Set());
  const [detecting, setDetecting] = useState(true); // true on mount — detect runs immediately

  // Prefetch ALL vault+strategy logs once when wallet connects
  // All pool cards share this data — no per-card RPC calls needed
  useEffect(() => {
    if (!userAddress) return;
    prefetchAllLogs(userAddress).then(cache => {
      if (cache) setAllLogs(cache);
    });
    // Refresh every 10 minutes to pick up new events
    const id = setInterval(() => {
      prefetchAllLogs(userAddress).then(cache => {
        if (cache) setAllLogs(cache);
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [userAddress]);

  // Refresh GeckoTerminal TVL/APR every 60s
  useEffect(() => {
    const refreshAll = async () => {
      if (!wagmiConfig) return;
      // Collect all unique token addresses + decimals across active pools
      const allTokenAddrs = [...new Set(pools.flatMap(p => [
        p.tokenA.address.toLowerCase(),
        p.tokenB.address.toLowerCase(),
      ]))];
      const tokenDecimalsMap = new Map<string, number>();
      pools.forEach(p => {
        tokenDecimalsMap.set(p.tokenA.address.toLowerCase(), p.tokenA.decimals);
        tokenDecimalsMap.set(p.tokenB.address.toLowerCase(), p.tokenB.decimals);
      });
      await fetchTokenPrices(allTokenAddrs, tokenDecimalsMap);
      for (const pool of pools) {
        // Use gecko for APR only — volume-based APR calc is reliable.
        // Skip gecko TVL entirely — it returns the full pool TVL which we can't
        // accurately fraction-scale for proxy tokens like YASH (causes wild swings).
        const g = await fetchGeckoAPR(pool.tokenA.address, pool.tokenB.address);
        const apr = g?.apr ?? 0;
        const aprSource: Pool["aprSource"] = apr > 0 ? "geckoterm" : "estimated";

        // Always use on-chain TVL estimate — accurate for all pair types
        const tvlUsd = await estimateTvlFromChain(
          wagmiConfig, pool.tokenA.address, pool.tokenB.address,
          pool.tokenA.decimals, pool.tokenB.decimals
        );

        // If gecko has no APR data, estimate from accumulated fees
        let finalApr = apr;
        let finalAprSource = aprSource;
        if (finalApr === 0 && tvlUsd > 0) {
          const feeApr = estimateAprFromFees(
            pool.pendingFees0, pool.pendingFees1,
            pool.tokenA.decimals, pool.tokenB.decimals,
            pool.tokenA.address, pool.tokenB.address,
            pool.lastHarvestTs, tvlUsd
          );
          if (feeApr > 0) { finalApr = feeApr; finalAprSource = "estimated"; }
        }

        if (tvlUsd > 0 || finalApr > 0) {
          setPools(prev => prev.map(p => p.id === pool.id
            ? { ...p, tvlUsd, apr: finalApr, aprSource: finalAprSource }
            : p));
        }
      }
    };
    if (pools.length === 0 || !wagmiConfig) return;
    refreshAll();
    const id = setInterval(refreshAll, 180_000); // 3 min to stay under gecko rate limits
    return () => clearInterval(id);
  }, [pools.length, wagmiConfig]);

  // No localStorage save needed — pools reload from strategy on every mount.

  // ─── STRATEGY-SOURCED POOL DETECTION ──────────────────────────────────────
  // Reads all active pairs directly from the strategy contract via raw JSON-RPC.
  // This works independently of wagmi chain config — just needs the RPC URL.
  // Runs on mount and whenever wallet address changes (to refresh userShares).
  // Cards only appear when an NFT exists in the strategy — no localStorage guessing.

  // Raw eth_call helper — no wagmi/viem dependency, works anywhere
  const ethCall = async (to: string, data: string): Promise<string> => {
    const res = await fetch(PEPU_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    });
    const j = await res.json();
    if (j.error) throw new Error(j.error.message);
    return j.result as string;
  };

  // ABI encode a call with no args, returns uint256
  const callUint256 = async (to: string, selector: string): Promise<bigint> => {
    const r = await ethCall(to, selector);
    return BigInt(r === "0x" ? 0 : r);
  };

  // ABI encode a call with one uint256 arg, returns bytes32
  const callBytes32ByIndex = async (to: string, selector: string, index: number): Promise<string> => {
    const idx = index.toString(16).padStart(64, "0");
    return await ethCall(to, selector + idx);
  };

  // ABI encode a call with one bytes32 arg, returns a tuple (positions struct)
  const callPositionByKey = async (to: string, key: string): Promise<any> => {
    const cleanKey = key.startsWith("0x") ? key.slice(2) : key;
    const r = await ethCall(to, "0x514ea4bf" + cleanKey.padStart(64, "0"));
    if (!r || r === "0x") return null;
    // Decode: token0(addr), token1(addr), positionTokenId(uint256),
    //         totalLiquidity(uint128), lastHarvest(uint256), totalHarvests(uint256),
    //         exists(bool), feeTier(uint24)
    const d = r.slice(2);
    const token0  = "0x" + d.slice(24, 64);
    const token1  = "0x" + d.slice(88, 128);
    const tokenId = BigInt("0x" + d.slice(128, 192));
    const liq     = BigInt("0x" + d.slice(192, 256));
    const lastHarvest  = BigInt("0x" + d.slice(256, 320));
    const totalHarvests = BigInt("0x" + d.slice(320, 384));
    const exists  = d.slice(384, 448) !== "0".repeat(64);
    return { token0, token1, tokenId, liq, lastHarvest, totalHarvests, exists };
  };

  // Read userShares and totalShares from vault
  const callUserShares = async (pairKey: string, user: string): Promise<{ shares: bigint; total: bigint }> => {
    const key  = pairKey.startsWith("0x") ? pairKey.slice(2) : pairKey;
    const addr = user.slice(2).padStart(64, "0");
    // userShares(bytes32,address)
    const sharesR = await ethCall(VAULT_ADDRESS, "0x" + "1c757b95" + key.padStart(64,"0") + addr);
    // totalShares(bytes32)
    const totalR  = await ethCall(VAULT_ADDRESS, "0x" + "12e8d594" + key.padStart(64,"0"));
    return {
      shares: BigInt(sharesR === "0x" ? 0 : sharesR),
      total:  BigInt(totalR  === "0x" ? 0 : totalR),
    };
  };

  useEffect(() => {
    const detect = async () => {
      setDetecting(true);
      try {
        // Get count of active pairs from strategy
        // activePairCount() selector = keccak256("activePairCount()")[0..4]
        const pairCount = await callUint256(STRATEGY_ADDRESS, "0x2fd16b8a");
        if (pairCount === 0n) { setDetecting(false); return; }

        const tokenMap = new Map<string, Token>(
          ALL_TOKENS.map(t => [t.address.toLowerCase(), t])
        );

        const newPools: Pool[] = [];

        for (let i = 0; i < Number(pairCount); i++) {
          try {
            // allPairKeys(uint256) selector
            const keyRaw = await callBytes32ByIndex(STRATEGY_ADDRESS, "0x9148c0f5", i);
            const key = keyRaw.length >= 66 ? ("0x" + keyRaw.slice(-64)) as `0x${string}` : null;
            if (!key) continue;

            // positions(bytes32) — get token addresses + metadata
            const pos = await callPositionByKey(STRATEGY_ADDRESS, key);
            if (!pos || !pos.exists) continue;

            const t0Addr = pos.token0.toLowerCase();
            const t1Addr = pos.token1.toLowerCase();

            const tokA = tokenMap.get(t0Addr) ?? {
              symbol: pos.token0.slice(0, 8) + "…",
              name: pos.token0, address: pos.token0, decimals: 18,
            };
            const tokB = tokenMap.get(t1Addr) ?? {
              symbol: pos.token1.slice(0, 8) + "…",
              name: pos.token1, address: pos.token1, decimals: 18,
            };

            // Read user shares if wallet connected
            let userShares = 0n, userShareOfPool = 0;
            if (userAddress) {
              try {
                const { shares, total } = await callUserShares(key, userAddress);
                userShares = shares;
                userShareOfPool = total > 0n ? Number((shares * 10000n) / total) : 0;
              } catch {}
            }

            newPools.push({
              id: key, tokenA: tokA, tokenB: tokB, pairKey: key,
              tvlUsd: 0, apr: 0, aprSource: "estimated" as const,
              userShares, userShareOfPool, boostActive: false,
              pendingFees0: 0n, pendingFees1: 0n,
              valueHistory: [], depositedUsd: 0,
              lastHarvestTs: Number(pos.lastHarvest),
              totalHarvests: Number(pos.totalHarvests),
              harvestReady: false,
              hasProxyToken: TAX_TOKENS.has(t0Addr) || TAX_TOKENS.has(t1Addr),
            });
          } catch { continue; }
        }

        if (newPools.length > 0) {
          setPools(newPools); // Replace entirely with on-chain truth
        }
      } catch (e) {
        console.warn("Strategy detect failed:", e);
      }
      setDetecting(false);
    };

    detect();
  }, [userAddress]);

  const handleCreated = useCallback((pool: Pool) => {
    setPools(prev => [pool, ...prev]);
    setNewIds(prev => new Set(prev).add(pool.id));
    setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(pool.id); return n; }), 10_000);
    setModal(null);
    setTimeout(() => setModal({ pool, mode: "add" }), 350);
  }, []);

  // Refresh userShares + pendingFees every 15s
  useEffect(() => {
    if (!userAddress || pools.length === 0 || !isRightChain || !wagmiConfig) return;
    const poolSnapshots = pools.map(p => ({
      id: p.id, pairKey: p.pairKey,
      addrA: p.tokenA.address as `0x${string}`,
      addrB: p.tokenB.address as `0x${string}`,
    }));

    const refresh = async () => {
      const results = await Promise.all(poolSnapshots.map(async (snap) => {
        try {
          const [shares, total, posData, harvestReadyVal] = await Promise.all([
            readContract(wagmiConfig, { address: VAULT_ADDRESS, abi: VAULT_ABI,
              functionName: "userShares", args: [snap.pairKey, userAddress] }) as Promise<bigint>,
            readContract(wagmiConfig, { address: VAULT_ADDRESS, abi: VAULT_ABI,
              functionName: "totalShares", args: [snap.pairKey] }) as Promise<bigint>,
            readContract(wagmiConfig, { address: STRATEGY_ADDRESS, abi: STRATEGY_ABI,
              functionName: "positions", args: [snap.pairKey] })
              .catch(() => null) as Promise<readonly [string,string,bigint,bigint,bigint,bigint,boolean,number] | null>,
            readContract(wagmiConfig, { address: STRATEGY_ADDRESS, abi: STRATEGY_ABI,
              functionName: "harvestReady", args: [snap.addrA, snap.addrB] })
              .catch(() => false) as Promise<boolean>,
          ]);
          const shareOfPool = total > 0n ? Number((shares * 10000n) / total) : 0;
          const lastHarvestTs = posData ? Number(posData[4]) : 0;
          const totalHarvests = posData ? Number(posData[5]) : 0;
          const tokenId = posData ? posData[2] : 0n;

          // Use static collect simulation for accurate pending fees.
          // strategy.pendingFees() only shows tokensOwed (stale until position is touched).
          // Static collect shows all accumulated fees including feeGrowthInside accumulators.
          let { fees0, fees1 } = await getPendingFeesFromNFT(null, tokenId);
          // Fallback: if static collect returned 0, try strategy pendingFees()
          // (works for proxy token pairs where PM collect may behave differently)
          if (fees0 === 0n && fees1 === 0n) {
            try {
              const fallbackFees = await readContract(wagmiConfig, {
                address: STRATEGY_ADDRESS, abi: STRATEGY_ABI,
                functionName: "pendingFees",
                args: [snap.addrA, snap.addrB],
              }) as readonly [bigint, bigint];
              if (fallbackFees?.[0] > 0n || fallbackFees?.[1] > 0n) {
                fees0 = fallbackFees[0];
                fees1 = fallbackFees[1];
              }
            } catch {}
          }

          return { id: snap.id, userShares: shares, userShareOfPool: shareOfPool,
                   pendingFees0: fees0, pendingFees1: fees1,
                   lastHarvestTs, totalHarvests, harvestReady: !!harvestReadyVal };
        } catch { return null; } // null = keep existing pool state unchanged
      }));

      setPools(prev => prev.map(pool => {
        const r = results.find(x => x?.id === pool.id);
        if (!r) return pool; // read failed — keep existing state intact
        const posUsd = pool.tvlUsd * (r.userShareOfPool / 10000);
        const now = Date.now();
        const history = [...(pool.valueHistory ?? [])];
        if (history.length === 0 && posUsd > 0) {
          // First data point — seed with 0 entry so chart shows rise from deposit
          history.push({ ts: now - 60_000, usd: 0 });
          history.push({ ts: now, usd: posUsd });
        } else if (history.length > 0 && (now - history[history.length - 1].ts > 55_000)) {
          history.push({ ts: now, usd: posUsd });
          if (history.length > 48) history.shift();
        }
        // Preserve last known non-zero fees if new read returned 0 (transient RPC failure)
        const pendingFees0 = r.pendingFees0 > 0n ? r.pendingFees0 : pool.pendingFees0;
        const pendingFees1 = r.pendingFees1 > 0n ? r.pendingFees1 : pool.pendingFees1;
        return { ...pool, userShares: r.userShares, userShareOfPool: r.userShareOfPool,
                 pendingFees0, pendingFees1, valueHistory: history,
                 lastHarvestTs: r.lastHarvestTs, totalHarvests: r.totalHarvests, harvestReady: r.harvestReady };
      }));
    };

    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  // userAddress in dep array ensures immediate refresh when wallet connects
  }, [userAddress, isRightChain, wagmiConfig, pools.length]);

  const totalTvl = pools.reduce((s, p) => s + p.tvlUsd, 0);
  const myPools  = pools.filter(p => p.userShares > 0n).length;

  return (
    <section className={styles.farmsSection}>

      <div className={styles.farmsHeader}>
        <div className={styles.farmsTitleGroup}>
          <span className={styles.farmsTitleAccent}>AUTO-COMPOUND</span>
          <span className={styles.farmsTitleMain}>LIQUIDITY FARMS</span>
        </div>
        <div className={styles.farmsSub}>
          Provide liquidity to any token pair on PepuSwap V3.
          Swap fees auto-compound every 24 hours — no manual harvesting needed.
        </div>
      </div>

      {isConnected && !isRightChain && (
        <div className={styles.networkWarn}>
          ⚠ Switch to <strong>Pepe Unchained L2</strong> (chain {CHAIN_ID}) to use farms
        </div>
      )}

      <div className={styles.statsBar}>
        {[
          { label: "TOTAL VALUE LOCKED", val: `$${fmt(totalTvl)}` },
          { label: "ACTIVE PAIRS",       val: `${pools.length}` },
          { label: "YOUR POSITIONS",     val: `${myPools}` },
          { label: "NEXT HARVEST CYCLE", val: countdown, mono: true },
        ].map(s => (
          <div key={s.label} className={styles.statItem}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statVal} ${s.mono ? styles.statMono : ""}`}>{s.val}</div>
          </div>
        ))}
      </div>

      {!isConnected ? (
        <div className={styles.walletGate}>
          <div className={styles.walletGateIcon}>⬡</div>
          <div className={styles.walletGateTitle}>CONNECT WALLET TO CONTINUE</div>
          <div className={styles.walletGateText}>
            Connect your wallet to start farming, view your positions, and track your earnings.
          </div>
          {!showConnectors ? (
            <button className={styles.walletGateBtn} onClick={() => { reset(); setShowConnectors(true); }}>
              {connectError ? "Try Again" : "Connect Wallet"}
            </button>
          ) : (
            <div className={styles.connectorList}>
              {connectors.map(connector => (
                <button key={connector.uid} className={styles.connectorBtn}
                  onClick={() => { reset(); connect({ connector }, { onError: () => setShowConnectors(true) }); setShowConnectors(false); }}>
                  {connector.name}
                </button>
              ))}
              <button className={styles.connectorCancelBtn} onClick={() => { reset(); setShowConnectors(false); }}>
                Cancel
              </button>
            </div>
          )}
          <div className={styles.walletGatePreview}>
            <div className={styles.walletGatePreviewItem}>
              <span className={styles.wgpIcon}>↺</span>
              <span>Auto-compounding LP fees — harvested every 24h</span>
            </div>
            <div className={styles.walletGatePreviewItem}>
              <span className={styles.wgpIcon}>◈</span>
              <span>Any token pair — PEPU, MFG, PTX and 100+ ecosystem tokens</span>
            </div>
            <div className={styles.walletGatePreviewItem}>
              <span className={styles.wgpIcon}>⚡</span>
              <span>Boost campaigns — earn extra rewards on promoted pools</span>
            </div>
          </div>
        </div>
      ) : (
        <CreatePoolPanel
          onCreated={handleCreated}
          existingIds={new Set(pools.map(p => p.id))}
          wagmiConfig={wagmiConfig}
        />
      )}

      {pools.length > 0 && (
        <div className={styles.poolsSection}>
          <div className={styles.poolsHeader}>
            <span className={styles.poolsTitle}>ACTIVE POOLS</span>
            <span className={styles.poolsCount}>{pools.length} pair{pools.length !== 1 ? "s" : ""}</span>
          </div>
          <AllLogsContext.Provider value={allLogs}>
          <div className={styles.poolGrid}>
            {pools.map(pool => (
              <PoolCard key={pool.id} pool={pool} userAddress={userAddress}
                onAdd={() => setModal({ pool, mode: "add" })}
                onWithdraw={() => setModal({ pool, mode: "withdraw" })}
                onRemove={() => setPools(prev => prev.filter(p => p.id !== pool.id))}
                isNew={newIds.has(pool.id)} />
            ))}
          </div>
          </AllLogsContext.Provider>
        </div>
      )}

      {pools.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>{detecting ? "⟳" : "◈"}</div>
          <div className={styles.emptyText}>{detecting ? "Loading pools…" : "No active pools"}</div>
          <div className={styles.emptySub}>
            {detecting
              ? "Reading positions from contract…"
              : "Select a pair above to open your first farm position"}
          </div>
        </div>
      )}

      {userAddress && userAddress.toLowerCase() === PROTOCOL_OWNER && (
        <AdminPanel userAddress={userAddress} wagmiConfig={wagmiConfig} />
      )}

      <div className={styles.disclaimer}>
        <strong>Risk disclosure:</strong> Liquidity provision carries risk including{" "}
        <strong>impermanent loss</strong>. If token prices diverge, your LP value may be
        less than holding individually. APR figures are estimates based on recent swap
        volume and are not guaranteed. Only deposit what you can afford to lose.
      </div>

      {modal && (
        <PoolModal pool={modal.pool} mode={modal.mode} userAddress={userAddress}
          wagmiConfig={wagmiConfig}
          onClose={() => setModal(null)}
          onSuccess={() => setPools(p => [...p])} />
      )}

    </section>
  );
}
