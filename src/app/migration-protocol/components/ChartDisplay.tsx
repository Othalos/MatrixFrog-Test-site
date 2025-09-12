"use client";
import React, { useState } from "react";

const ChartDisplay: React.FC = () => {
  const [chartError, setChartError] = useState<string | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);

  const handleChartError = () => {
    setChartError("Failed to load MatrixFrog chart. Please try refreshing the page.");
  };

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
        
        <div className="terminal-content" style={{ padding: "0", minHeight: "500px" }}>
          {chartError ? (
            <div className="chart-error">
              <p style={{ color: "#dc2626", fontSize: "0.875rem", padding: "2rem", textAlign: "center" }}>
                {chartError}
              </p>
              <button 
                onClick={() => setChartError(null)}
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
              src="https://www.geckoterminal.com/pepe-unchained/pools/0xe234fd7f3e1e8ff162b88b0ec459218cc15a3aaf"
              title="MatrixFrog Trading Chart"
              width="100%"
              height="500"
              style={{ 
                border: "none",
                borderRadius: "0 0 8px 8px"
              }}
              onError={handleChartError}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
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
