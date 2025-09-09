// In the same folder as WalletProvider.tsx, create this new file.
// DynamicWalletProvider.tsx

"use client"; // This component also needs to be a client component.

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import WalletProvider with SSR turned off
const WalletProvider = dynamic(
  () => import('./WalletProvider'), // Adjust the path if your file is named differently
  { ssr: false }
);

export default function DynamicWalletProvider({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
