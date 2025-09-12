// app/treasury/components/ChartDisplay.tsx
"use client";
import React, { useState } from "react";

const ChartDisplay: React.FC = () => {
  const [poolError, setPoolError] = useState<string | null>(null);

  const handlePoolError = () => {
    setPoolError("Failed to load Community Pool data. Please try refreshing the page.");
  };

  return (
    <>
      {/* MatrixFrog Chart Section */}
      <div className="terminal-frame chart-terminal mb-6">
        <div className="terminal-header">
          <div className="terminal-dots-container">
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
          </div>
          <div className="terminal-title">MatrixFrog Chart</div>
        </div>
        
        <div className="terminal-content" style={{ padding: "0", minHeight: "400px" }}>
          <div style={{ position: "relative", width: "100%", height: "400px" }}>
            <iframe
              id="geckoterminal-embed"
              title="GeckoTerminal Embed"
              src="https://www.geckoterminal.com/pepe-unchained/pools/0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5?embed=1&info=0&swaps=0&light_chart=0&chart_type=market_cap&resolution=15m&bg_color=111827"
              frameBorder="0"
              allow="clipboard-write"
              allowFullScreen
              style={{ 
                width: "100%", 
                height: "100%",
                borderRadius: "0 0 8px 8px"
              }}
            />
          </div>
        </div>
      </div>

      {/* Locked Community Pool Section */}
      <div className="terminal-frame pool-terminal mb-6">
        <div className="terminal-header">
          <div className="terminal-dots-container">
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
          </div>
          <div className="terminal-title">Locked Community Pool</div>
        </div>
        
        <div className="terminal-content" style={{ padding: "0", minHeight: "500px" }}>
          {poolError ? (
            <div className="pool-error">
              <p style={{ color: "#dc2626", fontSize: "0.875rem", padding: "2rem", textAlign: "center" }}>
                {poolError}
              </p>
              <button 
                onClick={() => setPoolError(null)}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #4ade80",
                  color: "#4ade80",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  margin: "0 auto",
                  display: "block"
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <iframe
              src="https://pepuswap.com/#/pools/103"
              title="Locked Community Pool"
              width="100%"
              height="500"
              style={{ 
                border: "none",
                borderRadius: "0 0 8px 8px"
              }}
              onError={handlePoolError}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>

      {/* Treasury Stats Footer */}
      <div className="text-center mt-6 text-green-700 font-mono text-sm">
        <p>LIVE TREASURY DATA • UPDATED IN REAL-TIME</p>
      </div>
    </>
  );
};

export default ChartDisplay;
