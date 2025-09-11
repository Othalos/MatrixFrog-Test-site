import type { Metadata } from "next";
import "./globals.css";
import WalletProvider from "./providers/WalletProvider";

export const metadata: Metadata = {
  title: "MatrixFrog - DeFi Staking Platform",
  description: "Stake MFG tokens for PTX rewards on the MatrixFrog platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
