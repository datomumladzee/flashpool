"use client";

import Image from "next/image";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function Navbar() {
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 32px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        <Image src="/logo.png" alt="FlashPool" width={32} height={32} style={{ borderRadius: "6px" }} />
        <span style={{
          fontFamily: "Inter, sans-serif",
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
        fontFamily: "Inter, sans-serif",
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
