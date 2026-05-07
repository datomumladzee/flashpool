"use client";

import Image from "next/image";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 48px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      backgroundColor: "rgba(155, 56, 60, 0.65)",
      backdropFilter: "blur(14px) saturate(140%)",
      WebkitBackdropFilter: "blur(14px) saturate(140%)",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <Image src="/logo.png" alt="FlashPool" width={32} height={32} style={{ borderRadius: "6px" }} />
        <span style={{
          fontFamily: "var(--font-inter), sans-serif",
          fontWeight: 600,
          fontSize: "18px",
          color: "#f5e6e6",
          letterSpacing: "0.02em",
        }}>
          FlashPool
        </span>
      </Link>

      <WalletMultiButton style={{
        backgroundColor: "#E8B547",
        color: "#000",
        fontFamily: "var(--font-inter), sans-serif",
        fontWeight: 600,
        fontSize: "14px",
        borderRadius: "10px",
        padding: "8px 20px",
        border: "none",
        cursor: "pointer",
        height: "auto",
      }} />
    </nav>
  );
}
