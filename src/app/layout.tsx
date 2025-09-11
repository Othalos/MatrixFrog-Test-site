import type { Metadata } from "next";
import "./globals.css";
import MinimalWagmiProvider from "./providers/MinimalWagmiProvider";

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
        <MinimalWagmiProvider>
          {children}
        </MinimalWagmiProvider>
      </body>
    </html>
  );
}
