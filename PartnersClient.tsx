"use client";
import { useState, useRef, useEffect } from "react";
import Script from "next/script";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import PartnersDisplay from "./PartnersDisplay";
import "../home-styles.css";

export default function PartnersClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const characters = "$MatrixFrogフロッグカエル0123456789";
    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);

    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#800000";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        if (Math.random() > 0.4) {
          const char = characters.charAt(
            Math.floor(Math.random() * characters.length)
          );
          ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        }

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }

        drops[i] += 0.9;
      }
    };

    const interval = setInterval(draw, 40);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="flex min-h-screen flex-col items-center relative overflow-x-hidden bg-black">
        {/* Matrix background */}
        <canvas
          ref={canvasRef}
          className="fixed top-0 left-0 w-full h-full z-0"
        ></canvas>

        {/* Scanlines and CRT effects */}
        <div className="fixed inset-0 bg-scanlines z-10 pointer-events-none"></div>
        <div className="fixed inset-0 bg-crt z-10 pointer-events-none"></div>
        <div className="fixed inset-0 vignette z-10 pointer-events-none"></div>

        {/* Main content */}
        <PartnersDisplay />

        {/* Spacer before footer */}
        <div style={{ height: "5rem" }}></div>

        <Footer />
      </main>

      {/* Twitter Widget Script */}
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Twitter widgets script loaded');
        }}
      />
    </>
  );
}
