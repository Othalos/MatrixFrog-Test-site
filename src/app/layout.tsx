import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
