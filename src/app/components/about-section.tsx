"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import SwapInterface from "./SwapInterface";

export default function AboutSection() {
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [displayText, setDisplayText] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [hasAnimationStarted, setHasAnimationStarted] = useState<boolean>(false);

  const dialogSequence = useMemo(
    () => [
      "> INITIALIZING MATRIXFROG PROTOCOL...",
      "> ACCESS GRANTED. WELCOME TO THE TRUTH.",
      "> SUBJECT: PROJECT MATRIXFROG",
      "> BEGIN TRANSMISSION:",
      "",
      "The path to the MFG core is a necessary one.",
      "You must first acquire the Pepu key and then open a gateway by bridging it.",
      "Your wallet's browser is the terminal; the buttons below are your way in.",
      "",
      "> END TRANSMISSION",
      "> [ SWAP PORTAL ACTIVE BELOW ]",
    ],
    []
  );

  const handleSkipAnimation = () => {
    if (currentStep < dialogSequence.length) {
      setDisplayText(dialogSequence);
      setCurrentStep(dialogSequence.length);
      setIsPulsing(true);
    }
  };

  useEffect(() => {
    if (!sectionRef.current) return;
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !hasAnimationStarted) {
        setIsHovered(true);
        setHasAnimationStarted(true);
      }
    };
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.3 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [hasAnimationStarted]);

  useEffect(() => {
    if (!isHovered || currentStep >= dialogSequence.length) return;
    const timer = setTimeout(
      () => {
        setDisplayText((prev) => [...prev, dialogSequence[currentStep]]);
        setCurrentStep((prev) => prev + 1);
        if (consoleRef.current) {
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
      },
      currentStep === 0 ? 800 : Math.random() * 400 + 200
    );
    return () => clearTimeout(timer);
  }, [currentStep, dialogSequence, isHovered]);

  useEffect(() => {
    if (currentStep >= dialogSequence.length) {
      setIsPulsing(true);
    }
  }, [currentStep, dialogSequence.length]);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="w-full min-h-screen py-12 md:py-24 flex items-center justify-center relative overflow-hidden"
    >
      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 relative z-20">
        <h2 className="sr-only">About MatrixFrog</h2>

        <div className="relative perspective-container">
          <div 
            className={`hologram-frame ${isHovered ? "active" : "inactive"}`}
            onClick={handleSkipAnimation}
            style={{ cursor: currentStep < dialogSequence.length ? 'pointer' : 'default' }}
          >
            <div className="hologram-scan-line"></div>
            <div className="hologram-pyramid top-left"></div>
            <div className="hologram-pyramid top-right"></div>
            <div className="hologram-pyramid bottom-left"></div>
            <div className="hologram-pyramid bottom-right"></div>
            <div className="glitch-overlay"></div>

            {currentStep > 0 && currentStep < dialogSequence.length && (
              <div className="skip-hint">Click to skip animation</div>
            )}

            <div ref={consoleRef} className="console-container">
              {displayText.map((line, index) => (
                <div
                  key={index}
                  className={`console-line ${line.startsWith(">") ? "command-line" : "output-line"}`}
                >
                  {line}
                </div>
              ))}
              <div className="console-cursor"></div>
            </div>

            {currentStep >= dialogSequence.length && (
              <div className={`action-buttons ${isPulsing ? "active" : ""}`}>
                <button
                  onClick={() => window.open(`https://app.uniswap.org/swap?outputcurrency=0x93aA0ccD1e5628d3A841C4DbdF602D9eb04085d6`, '_blank')}
                  className="action-button pepu-button"
                >
                  <span className="button-text">Buy PEPU</span>
                </button>
                <button
                  onClick={() => window.open(`https://pepubridge.com/`, '_blank')}
                  className="action-button bridge-button"
                >
                  <span className="button-text">Bridge PEPU</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <SwapInterface isVisible={currentStep >= dialogSequence.length && isPulsing} />

        {currentStep >= dialogSequence.length && (
          <div className={`fallback-container ${isPulsing ? "active" : ""}`}>
            <button
              onClick={() => window.open(`https://pepuswap.com/#/swap`, '_blank')}
              className="fallback-button"
            >
              <span className="fallback-button-text">Buy $MatrixFrog on PepuSwap</span>
            </button>
            <p className="fallback-note">Use this if swap fails above</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .perspective-container {
          perspective: 1000px;
          margin-bottom: 2rem;
          width: 100%;
        }

        .hologram-frame {
          width: 100%;
          min-height: 350px;
          background-color: rgba(0, 20, 0, 0.8);
          border: 1px solid rgba(0, 255, 65, 0.5);
          border-radius: 4px;
          position: relative;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.4), inset 0 0 10px rgba(0, 255, 65, 0.2);
          overflow: hidden;
          padding: 1rem;
          transition: all 0.5s;
        }

        .hologram-frame.inactive {
          opacity: 0.6;
          transform: translateY(20px);
        }

        .hologram-frame.active {
          opacity: 1;
          transform: translateY(0);
        }

        .hologram-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(to bottom, rgba(0, 255, 65, 0.5), transparent);
          animation: scan 5s linear infinite;
          z-index: 5;
          pointer-events: none;
        }

        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }

        .glitch-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 2px);
          pointer-events: none;
          z-index: 3;
          opacity: 0.3;
        }

        .hologram-pyramid {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 1px solid rgba(0, 255, 65, 0.7);
          z-index: 2;
        }

        .top-left { top: -3px; left: -3px; border-right: none; border-bottom: none; }
        .top-right { top: -3px; right: -3px; border-left: none; border-bottom: none; }
        .bottom-left { bottom: -3px; left: -3px; border-right: none; border-top: none; }
        .bottom-right { bottom: -3px; right: -3px; border-left: none; border-top: none; }

        .console-container {
          font-family: "Courier New", monospace;
          color: #00ff41;
          overflow-y: auto;
          max-height: 200px;
          position: relative;
          z-index: 4;
          font-size: 0.75rem;
          line-height: 1.4;
          margin-bottom: 1rem;
        }

        .console-line {
          margin-bottom: 0.5rem;
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.7);
        }

        .command-line {
          color: #00ff41;
          font-weight: bold;
        }

        .output-line {
          color: rgba(255, 255, 255, 0.85);
          padding-left: 0.25rem;
        }

        .console-cursor {
          display: inline-block;
          width: 6px;
          height: 12px;
          background-color: #00ff41;
          animation: blink 1s step-end infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .skip-hint {
          position: absolute;
          top: 10px;
          right: 10px;
          font-family: "Courier New", monospace;
          color: rgba(0, 255, 65, 0.6);
          font-size: 0.7rem;
          background: rgba(0, 20, 0, 0.8);
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          border: 1px solid rgba(0, 255, 65, 0.3);
          z-index: 10;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          padding: 0.5rem 0;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.5s;
          z-index: 4;
          position: relative;
        }

        .action-buttons.active {
          opacity: 1;
          transform: translateY(0);
        }

        .action-button {
          flex: 1;
          max-width: 200px;
          background: rgba(0, 40, 0, 0.6);
          border: 1px solid #00ff41;
          color: #00ff41;
          padding: 0.75rem 1.5rem;
          font-size: 0.9rem;
          font-weight: bold;
          font-family: "Courier New", monospace;
          border-radius: 4px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
        }

        .action-button:hover {
          background: rgba(0, 60, 0, 0.8);
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
          transform: translateY(-2px);
        }

        .button-text {
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.8);
        }

        .fallback-container {
          text-align: center;
          margin: 2rem 0;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s;
        }

        .fallback-container.active {
          opacity: 1;
          transform: translateY(0);
        }

        .fallback-button {
          background: rgba(0, 30, 0, 0.7);
          border: 1px solid rgba(0, 255, 65, 0.4);
          color: rgba(0, 255, 65, 0.8);
          padding: 0.75rem 2rem;
          font-size: 1rem;
          font-weight: bold;
          font-family: "Courier New", monospace;
          border-radius: 6px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
        }

        .fallback-button:hover {
          background: rgba(0, 40, 0, 0.9);
          border-color: #00ff41;
          color: #00ff41;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.4);
          transform: translateY(-2px);
        }

        .fallback-button-text {
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.6);
        }

        .fallback-note {
          font-family: "Courier New", monospace;
          color: rgba(0, 255, 65, 0.5);
          font-size: 0.75rem;
          margin-top: 0.5rem;
          font-style: italic;
        }

        @media (max-width: 640px) {
          .action-buttons {
            flex-direction: column;
            align-items: stretch;
          }
          
          .action-button {
            max-width: 100%;
          }
        }

        * {
          box-sizing: border-box;
        }
      @media (max-width: 768px) {
  .hologram-frame {
    min-height: 300px;
    padding: 0.75rem;
  }
  
  .console-container {
    font-size: 0.7rem;
    max-height: 180px;
  }
  
  .skip-hint {
    font-size: 0.65rem;
    padding: 0.2rem 0.4rem;
  }
  
  .fallback-button {
    padding: 0.65rem 1.5rem;
    font-size: 0.9rem;
  }
}
`}</style>
    </section>
  );
}
