"use client";

import React from "react";

interface EthSwapProps {
  isVisible: boolean;
  onClose?: () => void;
}

export default function EthSwap({ isVisible, onClose }: EthSwapProps) {
  if (!isVisible) return null;

  // Uniswap URL with ETH as input and PEPU pre-selected as output currency, forced dark theme
  const uniswapUrl = "https://app.uniswap.org/swap?chain=ethereum&inputCurrency=ETH&outputCurrency=0x93aa0ccd1e5628d3a841c4dbdf602d9eb04085d6&theme=dark";

  return (
    <div className="swap-modal-overlay">
      <div className="swap-modal-card">
        <div className="swap-header">
          <h3 className="swap-title">⚡ SWAP TOKENS</h3>
          {onClose && (
            <button onClick={onClose} className="close-button" aria-label="Close swap">
              ×
            </button>
          )}
          <p className="swap-subtitle">Trade ETH for PEPU via Uniswap</p>
        </div>

        <div className="iframe-container">
          <iframe
            src={uniswapUrl}
            title="Uniswap Swap Interface"
            className="uniswap-iframe"
            allow="clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>

        <div className="swap-info-box">
          <p className="info-item">
            🔄 Powered by{' '}
            <a 
              href="https://uniswap.org"
              target="_blank" 
              rel="noopener noreferrer"
              className="external-link"
            >
              Uniswap
            </a>
          </p>
          <p className="info-item">⚡ Optimized gas fees</p>
          <p className="info-item">🔒 Secure on-chain swaps</p>
        </div>
      </div>

      <style jsx>{`
        .swap-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .swap-modal-card {
          position: relative;
          background: linear-gradient(135deg, rgba(0, 20, 0, 0.95), rgba(0, 10, 0, 0.95));
          border: 2px solid #00ff41;
          border-radius: 12px;
          padding: 2rem;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 0 50px rgba(0, 255, 65, 0.3);
          font-family: "Courier New", monospace;
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }

        .swap-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .swap-title {
          color: #00ff41;
          font-size: 1.8rem;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
          margin: 0 0 0.5rem 0;
        }

        .swap-subtitle {
          color: rgba(0, 255, 65, 0.7);
          font-size: 0.9rem;
          margin: 0;
        }

        .close-button {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: none;
          border: none;
          color: #00ff41;
          font-size: 2rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: all 0.3s;
        }

        .close-button:hover {
          color: #4ade80;
          transform: scale(1.1);
        }

        .iframe-container {
          position: relative;
          width: 100%;
          height: 600px;
          border: 2px solid rgba(0, 255, 65, 0.5);
          border-radius: 8px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.5);
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
          margin-bottom: 1rem;
        }

        .uniswap-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        .swap-info-box {
          background: rgba(0, 150, 0, 0.12);
          border: 1px solid rgba(0, 255, 65, 0.3);
          border-radius: 6px;
          padding: 1rem;
        }

        .info-item {
          color: rgba(0, 255, 65, 0.8);
          font-size: 0.85rem;
          margin: 0.4rem 0;
        }

        .external-link {
          color: #00ff41;
          text-decoration: underline;
          transition: color 0.3s;
        }

        .external-link:hover {
          color: #4ade80;
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.5);
        }

        @media (max-width: 768px) {
          .swap-modal-card {
            padding: 1.5rem;
            max-height: 95vh;
          }

          .swap-title {
            font-size: 1.4rem;
          }

          .close-button {
            top: 1rem;
            right: 1rem;
          }

          .iframe-container {
            height: 550px;
          }
        }

        @media (max-width: 480px) {
          .swap-modal-card {
            padding: 1rem;
          }

          .swap-title {
            font-size: 1.2rem;
          }

          .swap-subtitle {
            font-size: 0.75rem;
          }

          .iframe-container {
            height: 500px;
          }

          .info-item {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
