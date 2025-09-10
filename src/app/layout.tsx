import type { Metadata } from "next";
import "./globals.css";
import { WagmiProvider } from "@/components/providers/WagmiProvider";

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
      <body className="antialiased">
        <WagmiProvider>
          {children}
        </WagmiProvider>
      </body>
    </html>
  );
}
