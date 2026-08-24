"use client";

import React from "react";
import { useWalletConnect } from "../hooks/useWalletConnect";

interface BridgeInterfaceProps {
  isVisible: boolean;
  onClose?: () => void;
}

export default function BridgeInterface({ isVisible, onClose }: BridgeInterfaceProps) {
  const { isConnected, address, chain, connectMetaMask } = useWalletConnect();

  if (!isVisible) return null;

  return (
    <div className="bridge-modal-overlay">
      <div className="bridge-modal-card">
        <div className="bridge-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="bridge-title">🌉 PEPU BRIDGE</h3>
            {onClose && (
              <button onClick={onClose} className="close-button" aria-label="Close">
                ×
              </button>
            )}
          </div>
          <p className="bridge-subtitle">Transfer PEPU between Ethereum and Pepe Unchained L2</p>
        </div>

        {!isConnected ? (
          <div className="bridge-connect">
            <p className="bridge-info">Connect your wallet to use the bridge</p>
            <button onClick={connectMetaMask} className="bridge-button primary">
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <div className="status-card">
              <div className="status-item">
                <span className="status-label">Your Address:</span>
                <span className="status-value">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Network:</span>
                <span className="status-value">{chain?.name || 'Unknown'}</span>
              </div>
            </div>

            {/* Embedded Bridge iframe */}
            <div className="iframe-wrapper">
              <iframe
                src="https://pepubridge.com"
                title="Pepe Unchained Bridge"
                className="bridge-iframe"
                allow="clipboard-write"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
              />
            </div>

            <div className="bridge-info-box">
              <p className="info-item">⏱️ Estimated arrival: ~10-30 minutes</p>
              <p className="info-item">💰 Bridge Fee: Gas costs only</p>
              <p className="info-item">🔒 Secure: Audited bridge contract</p>
              <p className="info-item">
                🌐 Powered by:{' '}
                <a 
                  href="https://superbridge.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  Superbridge
                </a>
              </p>
              <p className="info-item warning-text">
                ⚠️ Ensure your wallet supports custom networks before bridging
              </p>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .bridge-modal-overlay {
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

        .bridge-modal-card {
          position: relative;
          background: linear-gradient(135deg, rgba(0, 20, 0, 0.95), rgba(0, 10, 0, 0.95));
          border: 2px solid #00ff41;
          border-radius: 12px;
          padding: 2rem;
          max-width: 900px;
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

        .bridge-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .bridge-title {
          color: #00ff41;
          font-size: 1.8rem;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
          margin: 0 0 0.5rem 0;
        }

        .bridge-subtitle {
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

        .bridge-connect {
          text-align: center;
          padding: 3rem 0;
        }

        .bridge-info {
          color: rgba(0, 255, 65, 0.8);
          margin-bottom: 1.5rem;
          font-size: 1rem;
        }

        .bridge-button {
          background: linear-gradient(45deg, rgba(0, 60, 0, 0.9), rgba(0, 80, 0, 0.9));
          border: 2px solid #00ff41;
          color: #00ff41;
          padding: 1rem 2.5rem;
          font-size: 1rem;
          font-weight: bold;
          font-family: "Courier New", monospace;
          border-radius: 6px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.3s;
        }

        .bridge-button:hover {
          background: linear-gradient(45deg, rgba(0, 80, 0, 0.9), rgba(0, 100, 0, 0.9));
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
        }

        .status-card {
          background: rgba(0, 100, 0, 0.1);
          border: 1px solid rgba(0, 255, 65, 0.3);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.9rem;
        }

        .status-label {
          color: rgba(0, 255, 65, 0.7);
        }

        .status-value {
          color: #00ff41;
          font-weight: bold;
        }

        .iframe-wrapper {
          position: relative;
          width: 100%;
          height: 650px;
          border: 2px solid rgba(0, 255, 65, 0.5);
          border-radius: 8px;
          overflow: auto;
          background: #000;
          margin-bottom: 1.5rem;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
        }

        .bridge-iframe {
          width: 100%;
          height: 100%;
          min-height: 650px;
          border: none;
          display: block;
        }

        .bridge-info-box {
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

        .warning-text {
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: rgba(255, 200, 0, 0.8);
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
          .bridge-modal-card {
            padding: 1.5rem;
            max-height: 95vh;
          }

          .bridge-title {
            font-size: 1.4rem;
          }

          .close-button {
            top: 1rem;
            right: 1rem;
          }

          .iframe-wrapper {
            height: 550px;
          }

          .bridge-iframe {
            min-height: 550px;
          }
        }

        @media (max-width: 480px) {
          .bridge-modal-card {
            padding: 1rem;
          }

          .bridge-title {
            font-size: 1.2rem;
          }

          .bridge-subtitle {
            font-size: 0.75rem;
          }

          .iframe-wrapper {
            height: 500px;
          }

          .bridge-iframe {
            min-height: 500px;
          }

          .status-item {
            flex-direction: column;
            gap: 0.25rem;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
