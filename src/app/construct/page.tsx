"use client";

import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useState } from "react";
import { IoMdCheckmark } from "react-icons/io";
import styles from "./construct.module.css";

export default function ConstructPage() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [showEnteringText, setShowEnteringText] = useState(false);

  // WALLET WALL ENTFERNT - Direkter Zugang zum Construct
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Step 1: Show loading message for 2 seconds
    timers.push(
      setTimeout(() => {
        setShowEnteringText(true);

        // Step 2: Show "Entering the Construct" message for 1 second
        timers.push(
          setTimeout(() => {
            router.push("/construct/dashboard");
          }, 1000)
        );
      }, 2000)
    );

    // Cleanup: Clear all timers when component unmounts
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [router]);

  // Handle skip button click
  const handleSkip = () => {
    router.push("/construct/dashboard");
  };

  // Inline style for the skip button
  const skipButtonStyle: CSSProperties = {
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    zIndex: 9999,
    backgroundColor: "transparent",
    border: "1px solid #00ff41",
    color: "#00ff41",
    fontFamily: '"Courier New", monospace',
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    transform: "none",
    top: "auto",
    left: "auto",
  };

  // Combined style with hover effect
  const buttonStyle: CSSProperties = {
    ...skipButtonStyle,
    ...(isHovered
      ? {
        backgroundColor: "rgba(0, 255, 65, 0.2)",
        boxShadow: "0 0 10px rgba(0, 255, 65, 0.5)",
      }
      : {}),
  };

  return (
    <div className={styles.container}>
      {/* Terminal output */}
      <div className={styles.terminal}>
        <pre className={styles.terminalText}></pre>
      </div>

      <div className={styles.progressContainer}>
        <div style={{ fontSize: "2rem" }} className={styles.progressMessage}>
          LOADING THE CONSTRUCT...
        </div>
        {!showEnteringText && (
          <div className={styles.tokenMessage}>
            Access Granted - Welcome to the Matrix
          </div>
        )}
        {showEnteringText && (
          <div className={styles.tokenMessage}>
            Entering the Construct <IoMdCheckmark />
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "0.5rem",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "3rem",
          }}
        >
          <div className={styles.dot} />
          <div className={styles.dot2} />
          <div className={styles.dot3} />
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        style={buttonStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        WAKE UP
      </button>
    </div>
  );
}