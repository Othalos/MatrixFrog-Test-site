"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IoMdCheckmark } from "react-icons/io";
import styles from "./construct.module.css";

export default function ConstructPage() {
  const router = useRouter();
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

  return (
    <div className={styles.container}>
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
    </div>
  );
}