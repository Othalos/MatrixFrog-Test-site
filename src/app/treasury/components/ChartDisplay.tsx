// app/treasury/components/ChartDisplay.tsx
"use client";
import React, { useState } from "react";

const ChartDisplay: React.FC = () => {
  const [poolError, setPoolError] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<string>("matrixfrog");
  const [selectedPool, setSelectedPool] = useState<string>("pool103");

  const handlePoolError = () => {
    setPoolError("Failed to load Community Pool data. Please try refreshing the page.");
  };

  const chartOptions = [
    {
      value: "matrixfrog",
      title: "MatrixFrog (MFG)",
      src: "https://www.geckoterminal.com/pepe-unchained/pools/0x434dd2afe3baf277ffcfe9bef9787eda6b4c38d5?embed=1&info=0&swaps=0&light_chart=0&chart_type=market_cap&resolution=15m&bg_color=111827"
    },
    {
      value: "peptrix",
      title: "Peptrix (PTX)",
      src: "https://www.geckoterminal.com/pepe-unchained/pools/0xe17387d0b67aa4e2d595d8fc547297cabdf2a7d2?embed=1&info=0&swaps=0&light_chart=0&chart_type=market_cap&resolution=15m&bg_color=111827"
    }
  ];

  const poolOptions = [
    {
      value: "pool103",
      title: "Pool 103",
      src: "https://pepuswap.com/#/pools/103"
    },
    {
      value: "pool810",
      title: "Pool 810",
      src: "https://pepuswap.com/#/pools/810"
    },
    {
      value: "pool811",
      title: "Pool 811",
      src: "https://pepuswap.com/#/pools/811"
    }
  ];

  const currentChart = chartOptions.find(chart => chart.value === selectedChart);
  const currentPool = poolOptions.find(pool => pool.value === selectedPool);

  return (
    <>
      {/* Chart Section with Dropdown */}
      <div className="terminal-frame chart-terminal mb-6">
        <div className="terminal-header">
          <div className="terminal-dots-container">
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
          </div>
          <div className="terminal-title">
            Token Charts
          </div>
        </div>

        {/* Chart Selection Dropdown */}
        <div style={{ 
          padding: "16px 20px 0 20px", 
          backgroundColor: "rgba(0, 20, 0, 0.4)",
          borderBottom: "1px solid rgba(0, 255, 65, 0.2)"
        }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ 
              color: "#4ade80", 
              fontFamily: "monospace", 
              fontSize: "0.875rem",
              display: "block",
              marginBottom: "6px"
            }}>
              Select Token:
            </label>
            <select 
              value={selectedChart}
              onChange={(e) => setSelectedChart(e.target.value)}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(0, 255, 65, 0.5)",
                borderRadius: "4px",
                color: "#4ade80",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                padding: "8px 12px",
                minWidth: "200px",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {chartOptions.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  style={{ 
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "#4ade80"
                  }}
                >
                  {option.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="terminal-content" style={{ 
          padding: "20px", 
          minHeight: "400px"
        }}>
          <div style={{ 
            position: "relative", 
            width: "100%", 
            height: "400px",
            border: "1px solid rgba(0, 255, 65, 0.3)",
            borderRadius: "4px",
            overflow: "hidden"
          }}>
            <iframe
              key={selectedChart} // Force re-render when chart changes
              id="geckoterminal-embed"
              title={`${currentChart?.title} Chart`}
              src={currentChart?.src}
              frameBorder="0"
              allow="clipboard-write"
              allowFullScreen
              style={{ 
                width: "100%", 
                height: "100%",
                borderRadius: "4px"
              }}
            />
          </div>
        </div>
      </div>

      {/* Locked Community Pools Section - With Pool Selection */}
      <div className="terminal-frame pool-terminal mb-6">
        <div className="terminal-header">
          <div className="terminal-dots-container">
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
            <span className="terminal-dot"></span>
          </div>
          <div className="terminal-title">Locked Community Pools</div>
        </div>

        {/* Pool Selection Dropdown */}
        <div style={{ 
          padding: "16px 20px 0 20px", 
          backgroundColor: "rgba(0, 20, 0, 0.4)",
          borderBottom: "1px solid rgba(0, 255, 65, 0.2)"
        }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ 
              color: "#4ade80", 
              fontFamily: "monospace", 
              fontSize: "0.875rem",
              display: "block",
              marginBottom: "6px"
            }}>
              Select Pool:
            </label>
            <select 
              value={selectedPool}
              onChange={(e) => setSelectedPool(e.target.value)}
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(0, 255, 65, 0.5)",
                borderRadius: "4px",
                color: "#4ade80",
                fontFamily: "monospace",
                fontSize: "0.875rem",
                padding: "8px 12px",
                minWidth: "200px",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {poolOptions.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  style={{ 
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    color: "#4ade80"
                  }}
                >
                  {option.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="terminal-content" style={{ 
          padding: "20px", 
          minHeight: "500px", 
          position: "relative", 
          overflow: "hidden",
          background: "rgba(0, 9, 4, 0.3)"
        }}>
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
            <div style={{ 
              position: "relative", 
              width: "100%", 
              height: "460px", // Further reduced height
              overflow: "hidden",
              border: "1px solid rgba(0, 255, 65, 0.3)",
              borderRadius: "4px"
            }}>
              <iframe
                key={selectedPool} // Force re-render when pool changes
                src={currentPool?.src}
                title={`${currentPool?.title} (${currentPool?.src})`}
                style={{ 
                  width: "130%", // Increased width to crop more from sides
                  height: "700px", // Taller iframe for better content visibility
                  border: "none",
                  borderRadius: "4px",
                  position: "absolute",
                  top: "-120px", // More aggressive top crop to hide connection options
                  left: "-15%", // More aggressive side crop
                  opacity: "0.95"
                }}
                onError={handlePoolError}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>

      {/* Treasury Stats Footer */}
      <div className="text-center mt-6 text-green-700 font-mono text-sm">
        <p>LIVE TREASURY DATA • UPDATED IN REAL-TIME</p>
      </div>

      {/* Additional Styles for Mobile Responsiveness */}
      <style jsx>{`
        @media (max-width: 768px) {
          .terminal-content {
            padding: 12px !important;
          }
          
          select {
            width: 100% !important;
            min-width: auto !important;
          }

          /* Better mobile iframe sizing */
          .pool-terminal iframe {
            width: 110% !important;
            left: -5% !important;
            top: -100px !important;
            height: 760px !important;
          }

          .pool-terminal .terminal-content {
            min-height: 500px !important;
          }

          .pool-terminal .terminal-content > div {
            height: 460px !important;
          }
        }

        @media (max-width: 480px) {
          .terminal-content {
            padding: 8px !important;
          }
          
          .terminal-header .terminal-title {
            font-size: 0.875rem !important;
          }

          /* Moderate cropping on small mobile - just hide connect button */
          .pool-terminal iframe {
            width: 115% !important;
            left: -7.5% !important;
            top: -120px !important;
            height: 800px !important;
          }

          .pool-terminal .terminal-content {
            min-height: 450px !important;
          }

          .pool-terminal .terminal-content > div {
            height: 410px !important;
          }
        }

        /* Dropdown hover effects */
        select:hover {
          border-color: rgba(0, 255, 65, 0.8) !important;
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.3) !important;
        }

        select:focus {
          border-color: rgba(0, 255, 65, 1) !important;
          box-shadow: 0 0 12px rgba(0, 255, 65, 0.5) !important;
        }
      `}</style>
    </>
  );
};

export default ChartDisplay;
