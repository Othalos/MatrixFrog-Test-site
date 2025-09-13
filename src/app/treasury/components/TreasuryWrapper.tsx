"use client";
import dynamic from "next/dynamic";

const TreasuryClient = dynamic(() => import("./TreasuryClient"), {
  ssr: false,
});

export default function TreasuryWrapper() {
  return <TreasuryClient />;
}
