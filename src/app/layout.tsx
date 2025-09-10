// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
// 1. IMPORT THE NEW DYNAMIC PROVIDER
import DynamicWalletProvider from "../app/providers/DynamicWalletProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "MatrixFrog",
  description:
    "A choice between two worlds. Human or Frog? Reality or Simulation?",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body cz-shortcut-listen="true">
        {/* 2. USE THE NEW DYNAMIC PROVIDER HERE */}
        <DynamicWalletProvider>
          {children}
          <ToastContainer />
        </DynamicWalletProvider>
      </body>
    </html>
  );
}
