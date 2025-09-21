"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";

export default function AboutSection() {
  // Referenz für die Konsolen-Animation
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  // State für die Animation der Texteingabe
  const [displayText, setDisplayText] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  // State für die Pulsation des Buttons
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  // State für glitch effect auf dem Button
  const [isGlitching, setIsGlitching] = useState<boolean>(false);
  // Neuer State für Hover-Status
  const [isHovered, setIsHovered] = useState<boolean>(false);
  // State um zu tracken, ob die Animation gestartet wurde
  const [hasAnimationStarted, setHasAnimationStarted] =
    useState<boolean>(false);

  // Text-Sequenz für die Terminal-Animation - Desktop-freundlichere Version
  // Mit useMemo umhüllen, damit es nicht bei jedem Rendern neu erstellt wird
  const dialogSequence = useMemo(
    () => [
      "> INITIALIZING MATRIXFROG PROTOCOL...",
      "> ACCESS GRANTED. WELCOME TO THE TRUTH.",
      "> SUBJECT: PROJECT MATRIXFROG",
      "> BEGIN TRANSMISSION:",
      "",
      "In the digital construct we call reality, two worlds collide.",
      "Humans trapped in the system. Frogs aware of its nature.",
      "",
      "MATRIXFROG represents the nexus point – the choice between",
      "embracing humanity's struggle or transcending to amphibian enlightenment.",
      "",
      "> END TRANSMISSION",
      "> [ ACCESS TOKEN PORTAL AVAILABLE ]",
    ],
    []
  ); // Leeres Dependency-Array, da dieser Wert sich nie ändert

  // Hover-Detection mit Intersection Observer
  useEffect(() => {
    if (!sectionRef.current) return;

    // Callback-Funktion für den Observer
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      // Wenn die Sektion sichtbar ist, setzen wir isHovered auf true
      const [entry] = entries;
      if (entry.isIntersecting && !hasAnimationStarted) {
        setIsHovered(true);
        setHasAnimationStarted(true);
      }
    };

    // Observer initialisieren
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.3, // Animation startet, wenn mindestens 30% der Sektion sichtbar ist
    });

    // Element beobachten
    observer.observe(sectionRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasAnimationStarted]);

  // Animation für die Terminal-Eingabe, nur wenn isHovered true ist
  useEffect(() => {
    // Nur starten, wenn die Sektion gehovert wird und die Animation noch nicht beendet ist
    if (!isHovered || currentStep >= dialogSequence.length) return;

    const timer = setTimeout(
      () => {
        setDisplayText((prev) => [...prev, dialogSequence[currentStep]]);
        setCurrentStep((prev) => prev + 1);

        // Scroll zum Ende des Terminals
        if (consoleRef.current) {
          consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
      },
      currentStep === 0 ? 800 : Math.random() * 400 + 200
    ); // Leicht angepasste Geschwindigkeit

    return () => clearTimeout(timer);
  }, [currentStep, dialogSequence, isHovered]);

  // Button-Aktivierung nach Ende der Dialogsequenz
  useEffect(() => {
    if (currentStep >= dialogSequence.length) {
      setIsPulsing(true);
    }
  }, [currentStep, dialogSequence.length]);

  // Zufällige Glitch-Effekte für den Button (leicht angepasst)
  useEffect(() => {
    if (!isPulsing) return;

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), 250); // von 300ms auf 250ms reduziert
      }
    }, 3000); // von 4000ms auf 3000ms reduziert

    return () => clearInterval(glitchInterval);
  }, [isPulsing]);

  // Button-Click Handler mit Glitch-Effekt (leicht angepasst)
  const handleButtonClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Extra glitch effect on click
    setIsGlitching(true);
    setTimeout(() => {
      setIsGlitching(false);
      // Öffne in einem neuen Fenster nach dem Glitch-Effekt
      window.open(
        "https://pepuswap.com/#/swap?https://pepuswap.com//#/swap?inputCurrency=ETH&outputCurrency=0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5=0x2044682dad187456af1eee1b4e02bbf0a9abc919",
        "_blank"
      );
    }, 400); // von 500ms auf 400ms reduziert
  };

  return (
    <section
      id="about"
      ref={sectionRef}
      className="w-full min-h-screen py-12 md:py-24 flex items-center justify-center relative overflow-hidden"
    >
      <div className="max-w-5xl w-full mx-auto px-4 md:px-8 relative z-20">
        <h2 className="sr-only">About MatrixFrog</h2>

        {/* Holographic Terminal Container mit integriertem Button */}
        <div className="relative perspective-container">
          {/* Hologram Frame */}
          <div
            className={`hologram-frame ${isHovered ? "active" : "inactive"}`}
          >
            <div className="hologram-scan-line"></div>

            {/* Dreiecke für 3D-Hologramm-Effekt */}
            <div className="hologram-pyramid top-left"></div>
            <div className="hologram-pyramid top-right"></div>
            <div className="hologram-pyramid bottom-left"></div>
            <div className="hologram-pyramid bottom-right"></div>

            {/* Glitch Effect Overlay */}
            <div className="glitch-overlay"></div>

            {/* Konsole/Terminal Inhalt */}
            <div ref={consoleRef} className="console-container">
              {displayText.map((line, index) => (
                <div
                  key={index}
                  className={`console-line ${line.startsWith(">") ? "command-line" : "output-line"
                    }`}
                >
                  {line}
                </div>
              ))}
              <div className="console-cursor"></div>
            </div>

            {/* Integrierter Matrix-Button */}
            {currentStep >= dialogSequence.length && (
              <div className="matrix-portal-container">
                <div
                  className={`matrix-portal-frame ${isPulsing ? "active" : ""}`}
                >
                  <div className="matrix-portal-inner">
                    <a
                      href="https://pepuswap.com//#/swap?inputCurrency=ETH&outputCurrency=0x434DD2AFe3BAf277ffcFe9Bef9787EdA6b4C38D5"
                      className={`buy-matrix-button ${isPulsing ? "pulse-active" : ""
                        } ${isGlitching ? "glitching" : ""}`}
                      onClick={handleButtonClick}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="button-text">BUY $MATRIXFROG</span>
                      <div className="button-glitch"></div>
                    </a>
                  </div>

                  {/* Decorative Connectors */}
                  <div className="connector left-connector"></div>
                  <div className="connector right-connector"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS für spezielle Effekte - MOBILE OPTIMIZED */}
      <style jsx>{`
        .perspective-container {
          perspective: 1000px;
          margin-bottom: 2rem;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        @media (min-width: 640px) {
          .perspective-container {
            margin-bottom: 3rem;
            width: 90%;
            margin-left: auto;
            margin-right: auto;
          }
        }

        @media (min-width: 1024px) {
          .perspective-container {
            width: 85%;
          }
        }

        .hologram-frame {
          width: 100%;
          max-width: 100%;
          min-height: 350px;
          background-color: rgba(0, 20, 0, 0.8);
          border: 1px solid rgba(0, 255, 65, 0.5);
          border-radius: 4px;
          position: relative;
          transform-style: preserve-3d;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.4),
            inset 0 0 10px rgba(0, 255, 65, 0.2);
          overflow: hidden;
          padding: 1rem;
          transition: all 0.5s ease-in-out;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .hologram-frame {
            padding: 2rem;
            min-height: 400px;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.4),
              inset 0 0 15px rgba(0, 255, 65, 0.2);
          }
        }

        @media (min-width: 1024px) {
          .hologram-frame {
            padding: 2.5rem;
            min-height: 450px;
          }
        }

        .hologram-frame.inactive {
          opacity: 0.6;
          transform: translateY(20px);
        }

        .hologram-frame.active {
          opacity: 1;
          transform: translateY(0) rotateX(1deg);
          animation: hologram-float 10s ease-in-out infinite;
        }

        @media (min-width: 640px) {
          .hologram-frame.active {
            transform: translateY(0) rotateX(2deg);
          }
        }

        @keyframes hologram-float {
          0%,
          100% {
            transform: translateY(0) rotateX(1deg);
          }
          50% {
            transform: translateY(-5px) rotateX(-1deg);
          }
        }

        @media (min-width: 640px) {
          @keyframes hologram-float {
            0%,
            100% {
              transform: translateY(0) rotateX(2deg);
            }
            50% {
              transform: translateY(-10px) rotateX(-2deg);
            }
          }
        }

        .hologram-scan-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            to bottom,
            rgba(0, 255, 65, 0.5),
            rgba(0, 255, 65, 0)
          );
          animation: scan 5s linear infinite;
          z-index: 5;
          pointer-events: none;
        }

        @media (min-width: 640px) {
          .hologram-scan-line {
            height: 5px;
          }
        }

        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }

        .glitch-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.1),
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 2px
          );
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

        @media (min-width: 640px) {
          .hologram-pyramid {
            width: 30px;
            height: 30px;
          }
        }

        @media (min-width: 1024px) {
          .hologram-pyramid {
            width: 40px;
            height: 40px;
          }
        }

        .top-left {
          top: -3px;
          left: -3px;
          border-right: none;
          border-bottom: none;
        }

        .top-right {
          top: -3px;
          right: -3px;
          border-left: none;
          border-bottom: none;
        }

        .bottom-left {
          bottom: -3px;
          left: -3px;
          border-right: none;
          border-top: none;
        }

        .bottom-right {
          bottom: -3px;
          right: -3px;
          border-left: none;
          border-top: none;
        }

        @media (min-width: 640px) {
          .top-left, .top-right, .bottom-left, .bottom-right {
            top: -5px;
            bottom: -5px;
            left: -5px;
            right: -5px;
          }
          .top-left { top: -5px; left: -5px; }
          .top-right { top: -5px; right: -5px; }
          .bottom-left { bottom: -5px; left: -5px; }
          .bottom-right { bottom: -5px; right: -5px; }
        }

        .console-container {
          font-family: "Courier New", monospace;
          color: #00ff41;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: 200px;
          position: relative;
          z-index: 4;
          font-size: 0.75rem;
          word-break: break-word;
          line-height: 1.4;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .console-container {
            font-size: 0.9rem;
            max-height: 250px;
            line-height: 1.6;
          }
        }

        @media (min-width: 1024px) {
          .console-container {
            font-size: 1.1rem;
            max-height: 300px;
            line-height: 1.8;
          }
        }

        .console-line {
          margin-bottom: 0.5rem;
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.7);
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        @media (min-width: 640px) {
          .console-line {
            margin-bottom: 0.7rem;
          }
        }

        @media (min-width: 1024px) {
          .console-line {
            margin-bottom: 1rem;
          }
        }

        .command-line {
          color: #00ff41;
          font-weight: bold;
        }

        .output-line {
          color: rgba(255, 255, 255, 0.85);
          padding-left: 0.25rem;
        }

        @media (min-width: 640px) {
          .output-line {
            padding-left: 0.5rem;
          }
        }

        @media (min-width: 1024px) {
          .output-line {
            padding-left: 1.5rem;
            letter-spacing: 0.5px;
          }
        }

        .console-cursor {
          display: inline-block;
          width: 6px;
          height: 12px;
          background-color: #00ff41;
          animation: blink 1s step-end infinite;
        }

        @media (min-width: 640px) {
          .console-cursor {
            width: 8px;
            height: 16px;
          }
        }

        @media (min-width: 1024px) {
          .console-cursor {
            width: 10px;
            height: 20px;
          }
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }

        /* MatrixFrog Portal & Button Styles */
        .matrix-portal-container {
          margin-top: 1.5rem;
          position: relative;
          z-index: 10;
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .matrix-portal-container {
            margin-top: 2rem;
          }
        }

        @media (min-width: 1024px) {
          .matrix-portal-container {
            margin-top: 3rem;
          }
        }

        .matrix-portal-frame {
          position: relative;
          padding: 1rem 0;
          border-top: 1px solid rgba(0, 255, 65, 0.3);
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .matrix-portal-frame {
            padding: 1.5rem 0;
          }
        }

        .matrix-portal-frame.active {
          opacity: 1;
          transform: translateY(0);
        }

        .matrix-portal-inner {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }

        .connector {
          position: absolute;
          height: 2px;
          background: linear-gradient(
            90deg,
            rgba(0, 255, 65, 0),
            rgba(0, 255, 65, 0.7) 50%,
            rgba(0, 255, 65, 0)
          );
          top: 50%;
          width: 15%;
          z-index: -1;
        }

        @media (min-width: 640px) {
          .connector {
            width: 20%;
          }
        }

        @media (min-width: 1024px) {
          .connector {
            width: 30%;
          }
        }

        .left-connector {
          left: 0;
        }

        .right-connector {
          right: 0;
        }

        /* Button Styles - Mobile First */
        .buy-matrix-button {
          position: relative;
          padding: 10px 20px;
          background: rgba(0, 20, 0, 0.9);
          color: #00ff41;
          border: 2px solid #00ff41;
          border-radius: 4px;
          font-family: "Courier New", monospace;
          font-size: 0.85rem;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s;
          box-shadow: 0 0 10px rgba(0, 255, 65, 0.4);
          text-decoration: none;
          display: inline-block;
          transform-style: preserve-3d;
          text-align: center;
          max-width: 100%;
          box-sizing: border-box;
          white-space: nowrap;
        }

        @media (max-width: 400px) {
          .buy-matrix-button {
            font-size: 0.75rem;
            padding: 8px 16px;
          }
        }

        @media (min-width: 640px) {
          .buy-matrix-button {
            padding: 12px 24px;
            font-size: 1rem;
            box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
          }
        }

        @media (min-width: 1024px) {
          .buy-matrix-button {
            padding: 16px 36px;
            font-size: 1.2rem;
            letter-spacing: 2px;
          }
        }

        .buy-matrix-button:before {
          content: "";
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border: 1px solid rgba(0, 255, 65, 0.3);
          pointer-events: none;
          opacity: 0;
          transition: all 0.3s;
        }

        @media (min-width: 640px) {
          .buy-matrix-button:before {
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
          }
        }

        .buy-matrix-button:hover:before {
          opacity: 1;
          top: -6px;
          left: -6px;
          right: -6px;
          bottom: -6px;
        }

        @media (min-width: 640px) {
          .buy-matrix-button:hover:before {
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
          }
        }

        .buy-matrix-button:hover {
          background: rgba(0, 40, 0, 0.9);
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.7);
          transform: translateY(-1px) scale(1.02);
          color: #ffffff;
          text-shadow: 0 0 8px rgba(0, 255, 65, 1);
        }

        @media (min-width: 640px) {
          .buy-matrix-button:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 0 25px rgba(0, 255, 65, 0.7);
            text-shadow: 0 0 10px rgba(0, 255, 65, 1);
          }
        }

        .buy-matrix-button:active {
          transform: translateY(1px);
        }

        .button-text {
          position: relative;
          z-index: 2;
          text-shadow: 0 0 5px rgba(0, 255, 65, 0.7);
          white-space: nowrap;
        }

        .button-glitch {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(0, 255, 65, 0.2),
            transparent
          );
          z-index: 1;
          animation: glitch-animation 3s linear infinite;
        }

        @keyframes glitch-animation {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .pulse-active {
          animation: pulse 3s infinite;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 10px rgba(0, 255, 65, 0.4);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.6);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 10px rgba(0, 255, 65, 0.4);
          }
        }

        @media (min-width: 640px) {
          @keyframes pulse {
            0% {
              transform: scale(1);
              box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
            }
            50% {
              transform: scale(1.03);
              box-shadow: 0 0 25px rgba(0, 255, 65, 0.6);
            }
            100% {
              transform: scale(1);
              box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
            }
          }
        }

        /* Glitch effect for button */
        .glitching {
          animation: glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }

        @keyframes glitch {
          0% {
            transform: translate(0);
          }
          20% {
            transform: translate(-2px, 2px);
          }
          40% {
            transform: translate(-2px, -2px);
          }
          60% {
            transform: translate(2px, 2px);
          }
          80% {
            transform: translate(2px, -2px);
          }
          100% {
            transform: translate(0);
          }
        }

        @media (min-width: 640px) {
          @keyframes glitch {
            0% {
              transform: translate(0);
            }
            20% {
              transform: translate(-3px, 3px);
            }
            40% {
              transform: translate(-3px, -3px);
            }
            60% {
              transform: translate(3px, 3px);
            }
            80% {
              transform: translate(3px, -3px);
            }
            100% {
              transform: translate(0);
            }
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Ensure no horizontal overflow */
        * {
          box-sizing: border-box;
        }
      `}</style>
    </section>
  );
}
