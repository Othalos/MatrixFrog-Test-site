"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { parseEther, formatEther, createPublicClient, http } from "viem";
import { pepuMainnet } from "../lib/chains";
import { useWalletConnect } from "../hooks/useWalletConnect";

const PEPU_STAKING_MANAGER = "0x93aA0ccD1e5628d3A841C4DbdF602D9eb04085d6";
const WPEPU_ADDRESS = "0xF9Cf4A16d26979b929Be7176bAc4e7084975FCB8";
const MFG_ADDRESS = "0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5";
const PTX_ADDRESS = "0xe17387d0b67aa4e2d595d8fc547297cabdf2a7d2";
const UNIVERSAL_ROUTER_ADDRESS = "0x150c3F0f16C3D9EB34351d7af9c961FeDc97A0fb";

const STAKING_MANAGER_ABI = [
  { inputs: [{ name: "_user", type: "address" }], name: "poolStakers", outputs: [{ name: "amount", type: "uint256" }, { name: "stakedTime", type: "uint256" }, { name: "lastUpdatedBlock", type: "uint256" }, { name: "Harvestedrewards", type: "uint256" }, { name: "rewardDebt", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" }
];

const ERC20_ABI = [
  { inputs: [{ name: "_owner", type: "address" }], name: "balanceOf", outputs: [{ name: "balance", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }
];

interface Token {
  symbol: string;
  address: string;
  name: string;
  isNative?: boolean;
}

const TOKENS: Token[] = [
  { symbol: "PEPU", address: WPEPU_ADDRESS, name: "Pepe Unchained", isNative: true },
  { symbol: "MFG", address: MFG_ADDRESS, name: "MatrixFrog" },
  { symbol: "PTX", address: PTX_ADDRESS, name: "Peptrix" },
];

interface SwapInterfaceProps {
  isVisible: boolean;
}

export default function SwapInterface({ isVisible }: SwapInterfaceProps) {
  const [swapAmount, setSwapAmount] = useState<string>("");
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState<boolean>(false);
  const [estimatedOutput, setEstimatedOutput] = useState<string>("0");
  const [estimatedOutputRaw, setEstimatedOutputRaw] = useState<number>(0);
  const [stakedPepuBalance, setStakedPepuBalance] = useState<bigint>(0n);
  const [walletPepuBalance, setWalletPepuBalance] = useState<bigint>(0n);
  const [tokenBalances, setTokenBalances] = useState<Record<string, bigint>>({});
  const [contractsVerified, setContractsVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [swapStep, setSwapStep] = useState<string>("");
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const { isConnected, address, isCorrectNetwork, connectMetaMask, connectWalletConnect, connectCoinbase, switchToPepeUnchained, refetchBalance } = useWalletConnect();

  const publicClient = useMemo(() => createPublicClient({ chain: pepuMainnet, transport: http("/api/rpc", { batch: true, retryCount: 3, retryDelay: 1000 }) }), []);

  const handleSwitchTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setSwapAmount("");
    setEstimatedOutput("0");
  };

  const verifyContracts = useCallback(() => {
    if (!isConnected || !isCorrectNetwork) return;
    
    Promise.all([
      publicClient.getBytecode({ address: PEPU_STAKING_MANAGER as `0x${string}` }),
      publicClient.getBytecode({ address: WPEPU_ADDRESS as `0x${string}` }),
      publicClient.getBytecode({ address: MFG_ADDRESS as `0x${string}` }),
      publicClient.getBytecode({ address: PTX_ADDRESS as `0x${string}` }),
      publicClient.getBytecode({ address: UNIVERSAL_ROUTER_ADDRESS as `0x${string}` })
    ])
      .then((codes) => {
        const allExist = codes.every(code => code && code !== "0x");
        if (!allExist) throw new Error("One or more contracts not found");
        setContractsVerified(true);
        setVerificationError(null);
      })
      .catch((error: unknown) => {
        setVerificationError(error instanceof Error ? error.message : "Verification failed");
        setContractsVerified(false);
      });
  }, [isConnected, isCorrectNetwork, publicClient]);

  const fetchContractData = useCallback(() => {
    if (!address || !isConnected || !isCorrectNetwork || !contractsVerified) return;
    
    Promise.all([
      publicClient.readContract({ 
        address: PEPU_STAKING_MANAGER as `0x${string}`, 
        abi: STAKING_MANAGER_ABI, 
        functionName: "poolStakers", 
        args: [address as `0x${string}`] 
      }).catch(() => [0n, 0n, 0n, 0n, 0n] as [bigint, bigint, bigint, bigint, bigint]),
      publicClient.getBalance({ address: address as `0x${string}` }),
      publicClient.readContract({
        address: MFG_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`]
      }).catch(() => 0n),
      publicClient.readContract({
        address: PTX_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`]
      }).catch(() => 0n),
    ])
      .then(([stakerInfo, walletBalance, mfgBalance, ptxBalance]) => {
        const stakedAmount = (stakerInfo as [bigint, bigint, bigint, bigint, bigint])[0];
        setStakedPepuBalance(stakedAmount);
        setWalletPepuBalance(walletBalance);
        setTokenBalances({
          [WPEPU_ADDRESS]: walletBalance + stakedAmount,
          [MFG_ADDRESS]: mfgBalance as bigint,
          [PTX_ADDRESS]: ptxBalance as bigint,
        });
        setSwapError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) setSwapError(`Error: ${error.message}`);
      });
  }, [address, isConnected, isCorrectNetwork, contractsVerified, publicClient]);

  const getSwapQuote = useCallback((amountIn: string) => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setEstimatedOutput("0");
      return;
    }
    
    const amount = parseFloat(amountIn);
    
    const fallbackRatios: Record<string, Record<string, number>> = {
      [WPEPU_ADDRESS]: {
        [MFG_ADDRESS]: 18,
        [PTX_ADDRESS]: 0.5,
      },
      [MFG_ADDRESS]: {
        [WPEPU_ADDRESS]: 0.055,
        [PTX_ADDRESS]: 0.028,
      },
      [PTX_ADDRESS]: {
        [WPEPU_ADDRESS]: 2,
        [MFG_ADDRESS]: 36,
      },
    };
    
    const ratio = fallbackRatios[fromToken.address]?.[toToken.address] || 1;
    const estimatedOutput = amount * ratio * 0.997;
    
    setEstimatedOutput(estimatedOutput.toFixed(6));
    setEstimatedOutputRaw(estimatedOutput);
  }, [fromToken, toToken]);

const handleCompleteSwap = useCallback(() => {
  if (!address) { setSwapError("Wallet not connected"); return; }
  if (!swapAmount || parseFloat(swapAmount) <= 0) { setSwapError("Please enter an amount"); return; }
  if (fromToken.address === toToken.address) { setSwapError("Cannot swap same token"); return; }
  
  const amountToSwap = parseEther(swapAmount);
  const availableBalance = tokenBalances[fromToken.address] || 0n;
  
  if (amountToSwap > availableBalance) { 
    setSwapError(`Insufficient ${fromToken.symbol} balance`); 
    return; 
  }
  if (!window.ethereum) { setSwapError("No wallet provider found"); return; }
  
  setIsProcessing(true);
  setSwapError(null);
  
  let processPromise = Promise.resolve();
  
  // Step 1: Withdraw from staking if needed (only for PEPU)
  if (fromToken.isNative && stakedPepuBalance > 0n && amountToSwap > walletPepuBalance) {
    setSwapStep("Withdrawing PEPU from staking...");
    processPromise = processPromise
      .then(() => window.ethereum!.request({ 
        method: "eth_sendTransaction", 
        params: [{ from: address, to: PEPU_STAKING_MANAGER, data: "0x3ccfd60b" }] 
      }))
      .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }))
      .then(() => fetchContractData());
  }
  
  // Step 2: Wrap PEPU if it's the from token
  if (fromToken.isNative) {
    setSwapStep("Wrapping PEPU to WPEPU...");
    processPromise = processPromise
      .then(() => window.ethereum!.request({ 
        method: "eth_sendTransaction", 
        params: [{ 
          from: address, 
          to: WPEPU_ADDRESS, 
          value: `0x${amountToSwap.toString(16)}`, 
          data: "0xd0e30db0"
        }] 
      }))
      .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }))
      .then(() => fetchContractData());
  }
  
  // Step 3: Approve token
  const tokenToApprove = fromToken.isNative ? WPEPU_ADDRESS : fromToken.address;
  
  processPromise = processPromise
    .then(() => publicClient.readContract({ 
      address: tokenToApprove as `0x${string}`, 
      abi: ERC20_ABI, 
      functionName: "allowance", 
      args: [address as `0x${string}`, UNIVERSAL_ROUTER_ADDRESS as `0x${string}`] 
    }))
    .then((currentAllowance: unknown) => {
      if ((currentAllowance as bigint) < amountToSwap) {
        setSwapStep(`Approving ${fromToken.symbol}...`);
        const spenderPadded = UNIVERSAL_ROUTER_ADDRESS.slice(2).padStart(64, "0");
        const amountHex = amountToSwap.toString(16).padStart(64, "0");
        const approveData = `0x095ea7b3${spenderPadded}${amountHex}`;
        return window.ethereum!.request({ 
          method: "eth_sendTransaction", 
          params: [{ from: address, to: tokenToApprove, data: approveData }] 
        })
          .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }));
      }
      return Promise.resolve();
    });

  // Step 4: Execute swap
  processPromise = processPromise
    .then(() => {
      setSwapStep("Executing swap...");
      
      const minOutFloat = estimatedOutputRaw * 0.95;
      const minOut = parseEther(minOutFloat.toString());
      
      const tokenIn = fromToken.isNative ? WPEPU_ADDRESS : fromToken.address;
      const tokenOut = toToken.address;
      
      console.log("Swap params:", {
        from: fromToken.symbol,
        to: toToken.symbol,
        tokenIn,
        tokenOut,
        amountIn: formatEther(amountToSwap),
        minOut: formatEther(minOut)
      });
      
      // exactInputSingle(ExactInputSingleParams params)
      const functionSelector = "04e45aaf";
      
      const tokenInHex = tokenIn.toLowerCase().slice(2).padStart(64, "0");
      const tokenOutHex = tokenOut.toLowerCase().slice(2).padStart(64, "0");
      const fee = (10000).toString(16).padStart(64, "0"); // 1% fee
      const recipient = address.toLowerCase().slice(2).padStart(64, "0");
      const amountInHex = amountToSwap.toString(16).padStart(64, "0");
      const minOutHex = minOut.toString(16).padStart(64, "0");
      const sqrtPriceLimitX96 = "0".padStart(64, "0");
      
      const swapData = "0x" + functionSelector + tokenInHex + tokenOutHex + fee + recipient + amountInHex + minOutHex + sqrtPriceLimitX96;
      
      console.log("Encoded swap data:", swapData);
      
      return window.ethereum!.request({ 
        method: "eth_sendTransaction", 
        params: [{ 
          from: address, 
          to: UNIVERSAL_ROUTER_ADDRESS,
          data: swapData
        }] 
      })
        .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }))
        .then(() => {});
    });
  
  processPromise
    .then(() => {
      setSwapSuccess(true);
      setSwapStep("");
      setSwapAmount("");
      setEstimatedOutput("0");
      fetchContractData();
    })
    .catch((error: unknown) => {
      console.error("Swap error:", error);
      
      const err = error as { 
        message?: string;
        shortMessage?: string;
        reason?: string;
      };
      
      let errorMessage = "Swap failed";
      
      if (err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (err.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setSwapError(errorMessage);
      setSwapStep("");
    })
    .finally(() => {
      setIsProcessing(false);
    });
}, [address, swapAmount, fromToken, toToken, tokenBalances, stakedPepuBalance, walletPepuBalance, estimatedOutputRaw, publicClient, fetchContractData]);
  
  useEffect(() => { if (isConnected && isCorrectNetwork) verifyContracts(); }, [isConnected, isCorrectNetwork, verifyContracts]);
  useEffect(() => { if (contractsVerified) { fetchContractData(); const interval = setInterval(fetchContractData, 30000); return () => clearInterval(interval); } }, [contractsVerified, fetchContractData]);
  useEffect(() => { if (contractsVerified && swapAmount) { const timer = setTimeout(() => getSwapQuote(swapAmount), 500); return () => clearTimeout(timer); } }, [swapAmount, contractsVerified, getSwapQuote]);
  useEffect(() => { if (swapSuccess) { refetchBalance(); setTimeout(() => setSwapSuccess(false), 5000); } }, [swapSuccess, refetchBalance]);

  if (!isVisible) return null;

  const currentBalance = tokenBalances[fromToken.address] || 0n;

  return (
    <>
      <div className={`swap-container ${isVisible ? "active" : ""}`}>
        <div className="swap-frame">
          <h3 className="swap-title">MATRIX SWAP PORTAL</h3>
          {isConnected && isCorrectNetwork && !contractsVerified && (
            <div className="verification-section">
              <p className="verification-prompt">VERIFYING CONTRACTS...</p>
              {verificationError && <div className="verification-error"><p>⚠️ {verificationError}</p><button onClick={verifyContracts} className="retry-btn">Retry</button></div>}
            </div>
          )}
          {!isConnected && (
            <div className="wallet-section">
              <p className="wallet-prompt">CONNECT TO ACCESS THE MATRIX</p>
              <div className="wallet-buttons">
                <button onClick={connectMetaMask} className="wallet-btn">MetaMask</button>
                <button onClick={connectWalletConnect} className="wallet-btn">WalletConnect</button>
                <button onClick={connectCoinbase} className="wallet-btn">Coinbase</button>
              </div>
            </div>
          )}
          {isConnected && !isCorrectNetwork && (
            <div className="network-section">
              <p className="network-prompt">WRONG NETWORK</p>
              <p className="network-details">Switch to Pepe Unchained V2 (Chain ID: 97741)</p>
              <button onClick={switchToPepeUnchained} className="network-btn">SWITCH NETWORK</button>
            </div>
          )}
          {isConnected && isCorrectNetwork && contractsVerified && (
            <div className="swap-section">
              <div className="balance-display">
                <div className="balance-grid">
                  {TOKENS.map(token => {
                    const balance = tokenBalances[token.address] || 0n;
                    return (
                      <div key={token.symbol} className="balance-item-inline">
                        <span className="balance-label">{token.symbol}:</span>
                        <span className="balance-value">{parseFloat(formatEther(balance)).toFixed(4)}</span>
                      </div>
                    );
                  })}
                </div>
                <button onClick={fetchContractData} className="refresh-btn">↻</button>
              </div>
              
              <div className="token-section">
                <label className="token-label">FROM</label>
                <div className="token-input-wrapper">
                  <input 
                    type="number" 
                    value={swapAmount} 
                    onChange={(e) => setSwapAmount(e.target.value)} 
                    placeholder="0.0" 
                    className="token-input" 
                    step="0.0001" 
                    min="0" 
                  />
                  <button 
                    onClick={() => setSwapAmount(formatEther(currentBalance))} 
                    className="max-btn"
                  >
                    MAX
                  </button>
                </div>
                <div className="token-row">
                  <div className="token-selector" onClick={() => setShowFromDropdown(!showFromDropdown)}>
                    <span className="token-symbol">{fromToken.symbol}</span>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  {showFromDropdown && (
                    <div className="token-dropdown">
                      {TOKENS.filter(t => t.symbol !== toToken.symbol).map(token => (
                        <div 
                          key={token.symbol}
                          className="token-option"
                          onClick={() => {
                            setFromToken(token);
                            setShowFromDropdown(false);
                          }}
                        >
                          <span>{token.symbol}</span>
                          <span className="token-name">{token.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="token-balance">Balance: {parseFloat(formatEther(currentBalance)).toFixed(4)}</span>
                </div>
              </div>
              
              <div className="swap-arrow-container">
                <button className="swap-arrow-btn" onClick={handleSwitchTokens}>
                  ⇅
                </button>
              </div>
              
              <div className="token-section">
                <label className="token-label">TO (EST.)</label>
                <div className="token-display">
                  <input 
                    type="text" 
                    value={estimatedOutput} 
                    readOnly 
                    placeholder="0.0" 
                    className="token-input readonly" 
                  />
                </div>
                <div className="token-row">
                  <div className="token-selector" onClick={() => setShowToDropdown(!showToDropdown)}>
                    <span className="token-symbol">{toToken.symbol}</span>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  {showToDropdown && (
                    <div className="token-dropdown">
                      {TOKENS.filter(t => t.symbol !== fromToken.symbol).map(token => (
                        <div 
                          key={token.symbol}
                          className="token-option"
                          onClick={() => {
                            setToToken(token);
                            setShowToDropdown(false);
                          }}
                        >
                          <span>{token.symbol}</span>
                          <span className="token-name">{token.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="token-balance">{toToken.name}</span>
                </div>
              </div>
              
              {swapStep && <div className="step-indicator"><div className="spinner"></div><span>{swapStep}</span></div>}
              <button 
                onClick={handleCompleteSwap} 
                disabled={isProcessing || !swapAmount || parseFloat(swapAmount) <= 0} 
                className="swap-btn"
              >
                {isProcessing ? "PROCESSING..." : "SWAP NOW"}
              </button>
              <div className="network-info"><p>Pepe Unchained V2 • Chain {pepuMainnet.id}</p></div>
            </div>
          )}
        </div>
      </div>
      {swapSuccess && <div className="notification success"><p>Swap completed successfully!</p></div>}
      {swapError && <div className="notification error"><p>{swapError}</p><button onClick={() => setSwapError(null)} className="dismiss-btn">✕</button></div>}

<style jsx>{`
  .swap-container{margin-top:2rem;opacity:0;transform:translateY(20px);transition:all .6s}
  .swap-container.active{opacity:1;transform:translateY(0)}
  .swap-frame{background:rgba(0,20,0,.9);border:2px solid rgba(0,255,65,.5);border-radius:8px;padding:2rem;box-shadow:0 0 20px rgba(0,255,65,.3);max-width:600px;margin:0 auto}
  .swap-title{font-family:"Courier New",monospace;color:#00ff41;text-align:center;margin-bottom:2rem;font-size:1.5rem;text-shadow:0 0 10px rgba(0,255,65,.7);letter-spacing:2px}
  .verification-section,.wallet-section,.network-section{text-align:center;padding:1.5rem 0}
  .verification-section{border:1px solid rgba(255,170,0,.5);border-radius:6px;background:rgba(40,20,0,.3);margin-bottom:1.5rem}
  .verification-prompt,.wallet-prompt,.network-prompt{font-family:"Courier New",monospace;color:#00ff41;margin-bottom:1.5rem;font-size:1rem}
  .verification-prompt{color:#fa0}
  .verification-error p{color:#f44;font-family:"Courier New",monospace;font-size:.9rem;margin-bottom:1rem}
  .retry-btn,.wallet-btn,.network-btn{font-family:"Courier New",monospace;padding:.75rem 1rem;border-radius:4px;cursor:pointer;transition:all .3s}
  .retry-btn{background:rgba(40,0,0,.8);border:1px solid #f44;color:#f44}
  .retry-btn:hover{background:rgba(60,0,0,.9);box-shadow:0 0 15px rgba(255,68,68,.5)}
  .network-details{font-family:"Courier New",monospace;color:rgba(0,255,65,.7);margin-bottom:1rem;font-size:.9rem}
  .wallet-buttons{display:flex;flex-direction:column;gap:.75rem}
  .wallet-btn,.network-btn{background:rgba(0,40,0,.8);border:1px solid #00ff41;color:#00ff41}
  .wallet-btn:hover,.network-btn:hover{background:rgba(0,60,0,.9);box-shadow:0 0 15px rgba(0,255,65,.5)}
  .balance-display{background:rgba(0,40,0,.3);border:1px solid rgba(0,255,65,.5);border-radius:6px;padding:1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}
  .balance-grid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}
  .balance-item-inline{display:flex;flex-direction:column;gap:.25rem}
  .balance-label{font-family:"Courier New",monospace;color:#00ff41;font-size:.75rem}
  .balance-value{font-family:"Courier New",monospace;color:#fff;font-size:.85rem;font-weight:700}
  .refresh-btn{background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.5);color:#00ff41;padding:.5rem 1rem;border-radius:4px;font-family:"Courier New",monospace;font-size:.8rem;cursor:pointer;transition:all .3s}
  .refresh-btn:hover{background:rgba(0,255,65,.2)}
  .token-section{background:rgba(0,0,0,.3);border:1px solid rgba(0,255,65,.3);border-radius:8px;padding:1.5rem;margin-bottom:1rem;position:relative}
  .token-label{font-family:"Courier New",monospace;color:#00ff41;font-size:.9rem;display:block;margin-bottom:.5rem}
  .token-input-wrapper{position:relative;margin-bottom:.75rem}
  .token-input{background:transparent;border:none;color:#00ff41;font-family:"Courier New",monospace;font-size:2rem;width:100%;padding:.5rem 0;outline:0}
  .token-input.readonly{color:rgba(0,255,65,.7)}
  .token-display{margin-bottom:.75rem}
  .token-row{display:flex;justify-content:space-between;align-items:center;padding-top:.5rem;border-top:1px solid rgba(0,255,65,.2);position:relative}
  .token-selector{display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.5rem;border-radius:4px;transition:all .3s;border:1px solid rgba(0,255,65,.3);background:rgba(0,255,65,.05)}
  .token-selector:hover{background:rgba(0,255,65,.15)}
  .token-symbol{font-family:"Courier New",monospace;color:#00ff41;font-size:1.3rem;font-weight:700}
  .dropdown-arrow{font-size:.8rem;color:#00ff41}
  .token-dropdown{position:absolute;top:100%;left:0;z-index:10;background:rgba(0,20,0,.95);border:1px solid rgba(0,255,65,.5);border-radius:4px;margin-top:.5rem;min-width:200px;box-shadow:0 4px 12px rgba(0,255,65,.3)}
  .token-option{padding:.75rem 1rem;cursor:pointer;font-family:"Courier New",monospace;color:#00ff41;transition:all .3s;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,255,65,.1)}
  .token-option:last-child{border-bottom:none}
  .token-option:hover{background:rgba(0,255,65,.2)}
  .token-name{font-size:.75rem;color:rgba(0,255,65,.7)}
  .token-balance{font-family:"Courier New",monospace;color:rgba(0,255,65,.7);font-size:.85rem}
  .max-btn{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.5);color:#00ff41;padding:.25rem .5rem;border-radius:3px;font-family:"Courier New",monospace;font-size:.7rem;cursor:pointer;transition:all .3s}
  .max-btn:hover{background:rgba(0,255,65,.2)}
  .swap-arrow-container{text-align:center;margin:1rem 0}
  .swap-arrow-btn{background:rgba(0,60,0,.6);border:1px solid #00ff41;color:#00ff41;width:40px;height:40px;border-radius:50%;font-size:1.5rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .3s;font-family:monospace}
  .swap-arrow-btn:hover{background:rgba(0,80,0,.8);box-shadow:0 0 15px rgba(0,255,65,.5);transform:rotate(180deg)}
  .step-indicator{display:flex;align-items:center;justify-content:center;gap:.75rem;padding:1rem;margin:1rem 0;background:rgba(0,40,0,.3);border:1px solid rgba(0,255,65,.5);border-radius:6px;font-family:"Courier New",monospace;color:#00ff41;font-size:.9rem}
  .spinner{width:16px;height:16px;border:2px solid rgba(0,255,65,.3);border-top-color:#00ff41;border-radius:50%;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .swap-btn{width:100%;background:linear-gradient(45deg,rgba(0,60,0,.9),rgba(0,80,0,.9));border:2px solid #00ff41;color:#00ff41;padding:1.25rem 2rem;border-radius:6px;font-family:"Courier New",monospace;font-size:1.2rem;font-weight:700;cursor:pointer;transition:all .3s;text-transform:uppercase;letter-spacing:1px;box-shadow:0 0 25px rgba(0,255,65,.4)}
  .swap-btn:hover:not(:disabled){background:linear-gradient(45deg,rgba(0,80,0,.9),rgba(0,100,0,.9));box-shadow:0 0 35px rgba(0,255,65,.7);transform:translateY(-3px)}
  .swap-btn:disabled{opacity:.5;cursor:not-allowed}
  .network-info{margin-top:1.5rem;text-align:center;font-family:"Courier New",monospace;color:rgba(0,255,65,.7);font-size:.8rem}
  .notification{position:fixed;top:1rem;right:1rem;padding:1rem;border-radius:6px;font-family:"Courier New",monospace;font-size:.9rem;z-index:1000;max-width:300px;display:flex;justify-content:space-between;align-items:center}
  .notification.success{background:rgba(0,40,0,.9);border:1px solid #00ff41;color:#00ff41}
  .notification.error{background:rgba(40,0,0,.9);border:1px solid #f44;color:#f44}
  .dismiss-btn{background:transparent;border:none;color:inherit;font-family:"Courier New",monospace;font-size:1.2rem;cursor:pointer}
  @media (min-width:640px){.wallet-buttons{flex-direction:row;gap:1rem}.wallet-btn{flex:1}}
  @media (max-width:768px){.swap-frame{padding:1.5rem;max-width:100%}.swap-title{font-size:1.2rem;margin-bottom:1.5rem}.token-input{font-size:1.5rem}.token-symbol{font-size:1.1rem}.balance-display{flex-direction:column;align-items:stretch}.balance-grid{width:100%;grid-template-columns:1fr 1fr}.refresh-btn{width:100%;margin-top:.5rem}.max-btn{padding:.5rem .75rem;font-size:.8rem}.swap-btn{font-size:1rem;padding:1rem 1.5rem}.notification{max-width:calc(100% - 2rem);left:1rem;right:1rem}}
  @media (max-width:480px){.swap-frame{padding:1rem}.token-input{font-size:1.2rem}.token-section{padding:1rem}.balance-grid{grid-template-columns:1fr}}
`}</style>
          </>
  );
}
