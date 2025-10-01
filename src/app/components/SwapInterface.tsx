"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { parseEther, formatEther, createPublicClient, http } from "viem";
import { pepuMainnet } from "../lib/chains";
import { useWalletConnect } from "../hooks/useWalletConnect";

const PEPU_STAKING_MANAGER = "0x93aA0ccD1e5628d3A841C4DbdF602D9eb04085d6";
const WPEPU_ADDRESS = "0xF9Cf4A16d26979b929Be7176bAc4e7084975FCB8";
const MFG_ADDRESS = "0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5";
const UNIVERSAL_ROUTER_ADDRESS = "0x150c3F0f16C3D9EB34351d7af9c961FeDc97A0fb";

const STAKING_MANAGER_ABI = [
  { inputs: [{ name: "_user", type: "address" }], name: "poolStakers", outputs: [{ name: "amount", type: "uint256" }, { name: "stakedTime", type: "uint256" }, { name: "lastUpdatedBlock", type: "uint256" }, { name: "Harvestedrewards", type: "uint256" }, { name: "rewardDebt", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "withdraw", outputs: [], stateMutability: "nonpayable", type: "function" }
];

interface SwapInterfaceProps {
  isVisible: boolean;
}

export default function SwapInterface({ isVisible }: SwapInterfaceProps) {
  const [swapAmount, setSwapAmount] = useState<string>("");
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState<boolean>(false);
  const [estimatedMfgOutput, setEstimatedMfgOutput] = useState<string>("0");
  const [estimatedMfgOutputRaw, setEstimatedMfgOutputRaw] = useState<number>(0);
  const [stakedPepuBalance, setStakedPepuBalance] = useState<bigint>(0n);
  const [walletPepuBalance, setWalletPepuBalance] = useState<bigint>(0n);
  const [contractsVerified, setContractsVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [swapStep, setSwapStep] = useState<string>("");

  const { isConnected, address, isCorrectNetwork, connectMetaMask, connectWalletConnect, connectCoinbase, switchToPepeUnchained, refetchBalance } = useWalletConnect();

  const publicClient = useMemo(() => createPublicClient({ chain: pepuMainnet, transport: http("/api/rpc", { batch: true, retryCount: 3, retryDelay: 1000 }) }), []);

  const verifyContracts = useCallback(() => {
    if (!isConnected || !isCorrectNetwork) return;
    
    Promise.all([
      publicClient.getBytecode({ address: PEPU_STAKING_MANAGER as `0x${string}` }),
      publicClient.getBytecode({ address: WPEPU_ADDRESS as `0x${string}` }),
      publicClient.getBytecode({ address: MFG_ADDRESS as `0x${string}` }),
      publicClient.getBytecode({ address: UNIVERSAL_ROUTER_ADDRESS as `0x${string}` })
    ])
      .then(([stakingManagerCode, wPepuCode, mfgCode, routerCode]) => {
        const allExist = [stakingManagerCode, wPepuCode, mfgCode, routerCode].every(code => code && code !== "0x");
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
      publicClient.getBalance({ address: address as `0x${string}` })
    ])
      .then(([stakerInfo, walletBalance]) => {
        const stakedAmount = (stakerInfo as [bigint, bigint, bigint, bigint, bigint])[0];
        setStakedPepuBalance(stakedAmount);
        setWalletPepuBalance(walletBalance);
        setSwapError(null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error) setSwapError(`Error: ${error.message}`);
        setStakedPepuBalance(0n);
        setWalletPepuBalance(0n);
      });
  }, [address, isConnected, isCorrectNetwork, contractsVerified, publicClient]);

  const getSwapQuote = useCallback((amountIn: string) => {
    if (!amountIn || parseFloat(amountIn) <= 0) {
      setEstimatedMfgOutput("0");
      return;
    }
    
    const amount = parseFloat(amountIn);
    const fallbackRatio = 18;
    
    fetch(`https://api.geckoterminal.com/api/v2/networks/pepe-unchained/pools/0xe234fd7f3e1e8ff162b88b0ec459218cc15a3aaf`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        throw new Error("API request failed");
      })
      .then((data: { data?: { attributes?: { base_token_price_usd?: string; quote_token_price_usd?: string } } }) => {
        const poolData = data?.data?.attributes;
        
        if (poolData?.base_token_price_usd && poolData?.quote_token_price_usd) {
          const price1 = parseFloat(poolData.base_token_price_usd);
          const price2 = parseFloat(poolData.quote_token_price_usd);
          
          const ratio1 = price1 / price2;
          const ratio2 = price2 / price1;
          
          let priceRatio = ratio1;
          if (ratio1 < 1 || ratio1 > 50) {
            priceRatio = ratio2;
          }
          
          const estimatedOutput = amount * priceRatio * 0.997;
          
          console.log("Quote debug:", { 
            price1, 
            price2, 
            ratio1: ratio1.toFixed(4), 
            ratio2: ratio2.toFixed(4), 
            selectedRatio: priceRatio.toFixed(4),
            amountIn: amount, 
            estimatedOutput: estimatedOutput.toFixed(2)
          });
          
          if (estimatedOutput > amount && estimatedOutput < amount * 50) {
            setEstimatedMfgOutput(estimatedOutput.toFixed(6));
            setEstimatedMfgOutputRaw(estimatedOutput);
            return;
          }
        }
        
        throw new Error("Invalid price data");
      })
      .catch((error: unknown) => {
        console.error("GeckoTerminal API failed:", error);
        
        const estimatedOutput = amount * fallbackRatio * 0.997;
        console.log("Using fallback ratio:", fallbackRatio, "Output:", estimatedOutput.toFixed(2));
        setEstimatedMfgOutput(estimatedOutput.toFixed(6));
        setEstimatedMfgOutputRaw(estimatedOutput);
      });
  }, []);

const handleCompleteSwap = useCallback(() => {
  if (!address) { setSwapError("Wallet not connected"); return; }
  if (!swapAmount || parseFloat(swapAmount) <= 0) { setSwapError("Please enter an amount"); return; }
  const amountToSwap = parseEther(swapAmount);
  const totalPepu = stakedPepuBalance + walletPepuBalance;
  if (amountToSwap > totalPepu) { setSwapError("Insufficient PEPU balance"); return; }
  if (!window.ethereum) { setSwapError("No wallet provider found"); return; }
  
  setIsProcessing(true);
  setSwapError(null);
  
  let processPromise = Promise.resolve();
  
  if (stakedPepuBalance > 0n && amountToSwap > walletPepuBalance) {
    setSwapStep("Withdrawing PEPU from staking...");
    processPromise = processPromise
      .then(() => window.ethereum!.request({ 
        method: "eth_sendTransaction", 
        params: [{ from: address, to: PEPU_STAKING_MANAGER, data: "0x3ccfd60b" }] 
      }))
      .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }))
      .then(() => fetchContractData());
  }
  
processPromise = processPromise
  .then(() => {
    setSwapStep("Wrapping PEPU to WPEPU...");
    return window.ethereum!.request({ 
      method: "eth_sendTransaction", 
      params: [{ 
        from: address, 
        to: WPEPU_ADDRESS, 
        value: `0x${amountToSwap.toString(16)}`, 
        data: "0xd0e30db0" // deposit()
      }] 
    });
  })
  .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }))
  .then(() => fetchContractData());

processPromise = processPromise
  .then(() => publicClient.readContract({ 
    address: WPEPU_ADDRESS as `0x${string}`, 
    abi: [
      { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }
    ], 
    functionName: "allowance", 
    args: [address as `0x${string}`, UNIVERSAL_ROUTER_ADDRESS as `0x${string}`] 
  }))
  .then((currentAllowance: unknown) => {
    if ((currentAllowance as bigint) < amountToSwap) {
      setSwapStep("Approving WPEPU...");
      const spenderPadded = UNIVERSAL_ROUTER_ADDRESS.slice(2).padStart(64, "0");
      const amountHex = amountToSwap.toString(16).padStart(64, "0");
      const approveData = `0x095ea7b3${spenderPadded}${amountHex}`;
      return window.ethereum!.request({ 
        method: "eth_sendTransaction", 
        params: [{ from: address, to: WPEPU_ADDRESS, data: approveData }] 
      })
        .then((hash: unknown) => publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` }));
    }
    return Promise.resolve();
  });

processPromise = processPromise
  .then(() => {
    setSwapStep("Executing swap...");
    
    const deadline = Math.floor(Date.now() / 1000) + 1200;
    const estimatedOut = estimatedMfgOutputRaw;
    
    if (estimatedOut <= 0) {
      throw new Error("Unable to calculate expected output. Please refresh and try again.");
    }
    
    const minOutFloat = estimatedOut * 0.95;
    const minOut = parseEther(minOutFloat.toString());
    
    console.log("Swap params:", {
      amountIn: formatEther(amountToSwap),
      estimatedOut,
      minOut: formatEther(minOut),
      slippage: "5%",
      deadline
    });
    
    // exactInputSingle(ExactInputSingleParams params)
    // struct: tokenIn, tokenOut, fee, recipient, amountIn, amountOutMinimum, sqrtPriceLimitX96
    const functionSelector = "04e45aaf";
    
    // Encode struct as tuple
    const tokenIn = WPEPU_ADDRESS.toLowerCase().slice(2).padStart(64, "0");
    const tokenOut = MFG_ADDRESS.toLowerCase().slice(2).padStart(64, "0");
    const fee = (10000).toString(16).padStart(64, "0"); // 1% fee = 10000
    const recipient = address.toLowerCase().slice(2).padStart(64, "0");
    const amountInHex = amountToSwap.toString(16).padStart(64, "0");
    const minOutHex = minOut.toString(16).padStart(64, "0");
    const sqrtPriceLimitX96 = "0".padStart(64, "0");
    
    const swapData = "0x" + functionSelector + tokenIn + tokenOut + fee + recipient + amountInHex + minOutHex + sqrtPriceLimitX96;
    
    console.log("Encoded swap data:", swapData);
    console.log("Data length:", swapData.length);
    
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
      fetchContractData();
    })
    .catch((error: unknown) => {
      console.error("Swap error:", error);
      
      let errorMessage = "Swap failed";
      
      const err = error as { 
        message?: string;
        shortMessage?: string;
        reason?: string;
      };
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      if (err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas";
      } else if (err.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err.reason) {
        errorMessage = err.reason;
      }
      
      setSwapError(errorMessage);
      setSwapStep("");
    })
    .finally(() => {
      setIsProcessing(false);
    });
}, [address, swapAmount, stakedPepuBalance, walletPepuBalance, estimatedMfgOutputRaw, publicClient, fetchContractData]);
  
  useEffect(() => { if (isConnected && isCorrectNetwork) verifyContracts(); }, [isConnected, isCorrectNetwork, verifyContracts]);
  useEffect(() => { if (contractsVerified) { fetchContractData(); const interval = setInterval(fetchContractData, 30000); return () => clearInterval(interval); } }, [contractsVerified, fetchContractData]);
  useEffect(() => { if (contractsVerified && swapAmount) { const timer = setTimeout(() => getSwapQuote(swapAmount), 500); return () => clearTimeout(timer); } }, [swapAmount, contractsVerified, getSwapQuote]);
  useEffect(() => { if (swapSuccess) { refetchBalance(); setTimeout(() => setSwapSuccess(false), 5000); } }, [swapSuccess, refetchBalance]);

  if (!isVisible) return null;

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
                  <div className="balance-item">
                    <span className="balance-label">Available PEPU:</span>
                    <span className="balance-value">{parseFloat(formatEther(stakedPepuBalance + walletPepuBalance)).toFixed(4)}</span>
                  </div>
                  {stakedPepuBalance > 0n && (
                    <div className="balance-item-small">
                      <span className="balance-sublabel">({parseFloat(formatEther(stakedPepuBalance)).toFixed(2)} staked)</span>
                    </div>
                  )}
                </div>
                <button onClick={fetchContractData} className="refresh-btn">↻</button>
              </div>
              <div className="swap-info-box">
                <p className="swap-info-text">💡 PEPU → WPEPU → MFG</p>
                <p className="swap-info-subtext">Wraps PEPU, approves, then swaps directly on-chain</p>
              </div>
              <div className="token-section">
                <label className="token-label">FROM</label>
                <div className="token-input-wrapper">
                  <input type="number" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.0" className="token-input" step="0.0001" min="0" />
                  <button onClick={() => setSwapAmount(formatEther(stakedPepuBalance + walletPepuBalance))} className="max-btn">MAX</button>
                </div>
                <div className="token-row">
                  <span className="token-symbol">PEPU</span>
                  <span className="token-balance">Balance: {parseFloat(formatEther(stakedPepuBalance + walletPepuBalance)).toFixed(4)}</span>
                </div>
              </div>
              <div className="swap-arrow">↓</div>
              <div className="token-section">
                <label className="token-label">TO (EST.)</label>
                <div className="token-display">
                  <input type="text" value={estimatedMfgOutput} readOnly placeholder="0.0" className="token-input readonly" />
                </div>
                <div className="token-row">
                  <span className="token-symbol">MFG</span>
                  <span className="token-balance">MatrixFrog</span>
                </div>
              </div>
              {swapStep && <div className="step-indicator"><div className="spinner"></div><span>{swapStep}</span></div>}
              <button onClick={handleCompleteSwap} disabled={isProcessing || !swapAmount || parseFloat(swapAmount) <= 0} className="swap-btn">{isProcessing ? "PROCESSING..." : "SWAP NOW"}</button>
              <div className="network-info"><p>Pepe Unchained V2 • Chain {pepuMainnet.id}</p></div>
            </div>
          )}
        </div>
      </div>
      {swapSuccess && <div className="notification success"><p>Swap completed successfully!</p></div>}
      {swapError && <div className="notification error"><p>{swapError}</p><button onClick={() => setSwapError(null)} className="dismiss-btn">✕</button></div>}
      <style jsx>{`
        .swap-container{margin-top:2rem;opacity:0;transform:translateY(20px);transition:all .6s}.swap-container.active{opacity:1;transform:translateY(0)}.swap-frame{background:rgba(0,20,0,.9);border:2px solid rgba(0,255,65,.5);border-radius:8px;padding:2rem;box-shadow:0 0 20px rgba(0,255,65,.3);max-width:600px;margin:0 auto}.swap-title{font-family:"Courier New",monospace;color:#00ff41;text-align:center;margin-bottom:2rem;font-size:1.5rem;text-shadow:0 0 10px rgba(0,255,65,.7);letter-spacing:2px}.verification-section,.wallet-section,.network-section{text-align:center;padding:1.5rem 0}.verification-section{border:1px solid rgba(255,170,0,.5);border-radius:6px;background:rgba(40,20,0,.3);margin-bottom:1.5rem}.verification-prompt,.wallet-prompt,.network-prompt{font-family:"Courier New",monospace;color:#00ff41;margin-bottom:1.5rem;font-size:1rem}.verification-prompt{color:#fa0}.verification-error p{color:#f44;font-family:"Courier New",monospace;font-size:.9rem;margin-bottom:1rem}.retry-btn,.wallet-btn,.network-btn{font-family:"Courier New",monospace;padding:.75rem 1rem;border-radius:4px;cursor:pointer;transition:all .3s}.retry-btn{background:rgba(40,0,0,.8);border:1px solid #f44;color:#f44}.retry-btn:hover{background:rgba(60,0,0,.9);box-shadow:0 0 15px rgba(255,68,68,.5)}.network-details{font-family:"Courier New",monospace;color:rgba(0,255,65,.7);margin-bottom:1rem;font-size:.9rem}.wallet-buttons{display:flex;flex-direction:column;gap:.75rem}.wallet-btn,.network-btn{background:rgba(0,40,0,.8);border:1px solid #00ff41;color:#00ff41}.wallet-btn:hover,.network-btn:hover{background:rgba(0,60,0,.9);box-shadow:0 0 15px rgba(0,255,65,.5)}.balance-display{background:rgba(0,40,0,.3);border:1px solid rgba(0,255,65,.5);border-radius:6px;padding:1rem;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}.balance-grid{flex:1;display:flex;flex-direction:column;gap:.5rem}.balance-item{display:flex;flex-direction:column;gap:.25rem}.balance-label{font-family:"Courier New",monospace;color:#00ff41;font-size:.8rem}.balance-value{font-family:"Courier New",monospace;color:#fff;font-size:1rem;font-weight:700}.balance-item-small{display:flex;align-items:center}.balance-sublabel{font-family:"Courier New",monospace;color:rgba(0,255,65,.6);font-size:.75rem;font-style:italic}.refresh-btn{background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.5);color:#00ff41;padding:.5rem 1rem;border-radius:4px;font-family:"Courier New",monospace;font-size:.8rem;cursor:pointer;transition:all .3s}.refresh-btn:hover{background:rgba(0,255,65,.2)}.swap-info-box{background:rgba(0,40,60,.3);border:1px solid rgba(0,200,255,.4);border-radius:6px;padding:1rem;margin-bottom:1.5rem}.swap-info-text{font-family:"Courier New",monospace;color:#0cf;font-size:.9rem;margin-bottom:.5rem}.swap-info-subtext{font-family:"Courier New",monospace;color:rgba(255,255,255,.7);font-size:.8rem;line-height:1.4}.token-section{background:rgba(0,0,0,.3);border:1px solid rgba(0,255,65,.3);border-radius:8px;padding:1.5rem;margin-bottom:1rem}.token-label{font-family:"Courier New",monospace;color:#00ff41;font-size:.9rem;display:block;margin-bottom:.5rem}.token-input-wrapper{position:relative;margin-bottom:.75rem}.token-input{background:0 0;border:none;color:#00ff41;font-family:"Courier New",monospace;font-size:2rem;width:100%;padding:.5rem 0;outline:0}.token-input.readonly{color:rgba(0,255,65,.7)}.token-display{margin-bottom:.75rem}.token-row{display:flex;justify-content:space-between;align-items:center;padding-top:.5rem;border-top:1px solid rgba(0,255,65,.2)}.token-symbol{font-family:"Courier New",monospace;color:#00ff41;font-size:1.3rem;font-weight:700}.token-balance{font-family:"Courier New",monospace;color:rgba(0,255,65,.7);font-size:.85rem}.max-btn{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);background:rgba(0,255,65,.1);border:1px solid rgba(0,255,65,.5);color:#00ff41;padding:.25rem .5rem;border-radius:3px;font-family:"Courier New",monospace;font-size:.7rem;cursor:pointer;transition:all .3s}.max-btn:hover{background:rgba(0,255,65,.2)}.swap-arrow{text-align:center;color:#00ff41;font-size:2.5rem;margin:1.5rem 0;text-shadow:0 0 15px rgba(0,255,65,.8);animation:pulse 2s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.1)}}.step-indicator{display:flex;align-items:center;justify-content:center;gap:.75rem;padding:1rem;margin:1rem 0;background:rgba(0,40,0,.3);border:1px solid rgba(0,255,65,.5);border-radius:6px;font-family:"Courier New",monospace;color:#00ff41;font-size:.9rem}.spinner{width:16px;height:16px;border:2px solid rgba(0,255,65,.3);border-top-color:#00ff41;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.swap-btn{width:100%;background:linear-gradient(45deg,rgba(0,60,0,.9),rgba(0,80,0,.9));border:2px solid #00ff41;color:#00ff41;padding:1.25rem 2rem;border-radius:6px;font-family:"Courier New",monospace;font-size:1.2rem;font-weight:700;cursor:pointer;transition:all .3s;text-transform:uppercase;letter-spacing:1px;box-shadow:0 0 25px rgba(0,255,65,.4)}.swap-btn:hover:not(:disabled){background:linear-gradient(45deg,rgba(0,80,0,.9),rgba(0,100,0,.9));box-shadow:0 0 35px rgba(0,255,65,.7);transform:translateY(-3px)}.swap-btn:disabled{opacity:.5;cursor:not-allowed}.network-info{margin-top:1.5rem;text-align:center;font-family:"Courier New",monospace;color:rgba(0,255,65,.7);font-size:.8rem}.notification{position:fixed;top:1rem;right:1rem;padding:1rem;border-radius:6px;font-family:"Courier New",monospace;font-size:.9rem;z-index:1000;max-width:300px;display:flex;justify-content:space-between;align-items:center}.notification.success{background:rgba(0,40,0,.9);border:1px solid #00ff41;color:#00ff41}.notification.error{background:rgba(40,0,0,.9);border:1px solid #f44;color:#f44}.dismiss-btn{background:0 0;border:none;color:inherit;font-family:"Courier New",monospace;font-size:1.2rem;cursor:pointer}@media (min-width:640px){.wallet-buttons{flex-direction:row;gap:1rem}.wallet-btn{flex:1}}*{box-sizing:border-box}
      @media (max-width: 768px) {
  .swap-frame {
    padding: 1.5rem;
    max-width: 100%;
  }
  
  .swap-title {
    font-size: 1.2rem;
    margin-bottom: 1.5rem;
  }
  
  .token-input {
    font-size: 1.5rem;
  }
  
  .token-symbol {
    font-size: 1.1rem;
  }
  
  .balance-display {
    flex-direction: column;
    align-items: stretch;
  }
  
  .balance-grid {
    width: 100%;
  }
  
  .refresh-btn {
    width: 100%;
    margin-top: 0.5rem;
  }
  
  .max-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .swap-btn {
    font-size: 1rem;
    padding: 1rem 1.5rem;
  }
  
  .notification {
    max-width: calc(100% - 2rem);
    left: 1rem;
    right: 1rem;
  }
}

@media (max-width: 480px) {
  .swap-frame {
    padding: 1rem;
  }
  
  .token-input {
    font-size: 1.2rem;
  }
  
  .swap-info-box {
    padding: 0.75rem;
  }
  
  .token-section {
    padding: 1rem;
  }
}
`}</style>
    </>
  );
}
