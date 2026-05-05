"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import Navbar from "@/components/Navbar";
import idl from "@/lib/idl.json";

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
const USDC_MINT  = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

type TxStatus = "idle" | "signing" | "pending" | "success" | "error";

export default function CreatePage() {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [reason,          setReason]          = useState("");
  const [numContributors, setNumContributors]  = useState(5);
  const [amountPerPerson, setAmountPerPerson]  = useState(400);
  const [deadline,        setDeadline]         = useState("");
  const [status,          setStatus]           = useState<TxStatus>("idle");
  const [errorMsg,        setErrorMsg]         = useState("");

  const goal = numContributors * amountPerPerson;

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !wallet.publicKey) return;

    setStatus("signing");
    setErrorMsg("");

    try {
      const [userProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile"), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      // get current pool_count — 0 if profile doesn't exist yet
      let poolCount = 0;
      try {
        const profile = await (program.account as any).userProfile.fetch(userProfilePda);
        poolCount = profile.poolCount.toNumber();
      } catch {
        poolCount = 0;
      }

      const poolCountBytes = new BN(poolCount).toArrayLike(Buffer, "le", 8);
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), wallet.publicKey.toBuffer(), poolCountBytes],
        PROGRAM_ID
      );

      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      const amountLamports    = new BN(amountPerPerson * 1_000_000); // USDC has 6 decimals

      setStatus("pending");

      await program.methods
        .createPool(
          reason,
          numContributors,
          amountLamports,
          new BN(deadlineTimestamp),
          USDC_MINT
        )
        .accounts({
          creator:       wallet.publicKey,
          userProfile:   userProfilePda,
          pool:          poolPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus("success");
      router.push(`/pool/${poolPda.toBase58()}`);

    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message ?? "Transaction failed");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "var(--text)",
    fontSize: "14px",
    outline: "none",
    fontFamily: "Inter, sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    color: "var(--text-muted)",
    marginBottom: "8px",
    fontFamily: "JetBrains Mono, monospace",
    letterSpacing: "0.08em",
  };

  const busy = status === "signing" || status === "pending";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        minHeight: "calc(100vh - 70px)",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          maxWidth: "900px",
          width: "100%",
          background: "var(--bg-card)",
          borderRadius: "20px",
          border: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
        }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "24px" }}>
                PROTOCOL V1.0
              </p>
              <h1 style={{ fontSize: "36px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, marginBottom: "16px", fontFamily: "Inter, sans-serif" }}>
                Create a{" "}
                <em style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "var(--gold)" }}>Pool</em>
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.7 }}>
                Deploy a transparent, autonomous smart contract to collect funds. If the goal isn't met, everyone gets refunded automatically.
              </p>
            </div>

            {/* Live preview pills */}
            <div>
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                {[
                  { label: "GOAL",   value: `$${goal.toLocaleString()}` },
                  { label: "PEOPLE", value: String(numContributors) },
                  { label: "EACH",   value: `$${amountPerPerson}` },
                ].map((pill) => (
                  <div key={pill.label} style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    textAlign: "center",
                    flex: 1,
                  }}>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "var(--text-muted)", marginBottom: "4px", letterSpacing: "0.1em" }}>
                      {pill.label}
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "15px", fontWeight: 700, color: "var(--gold)" }}>
                      {pill.value}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                ✓ Verified Smart Contract &nbsp;•&nbsp; No Middleman
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{
            padding: "48px 40px",
            background: "rgba(0,0,0,0.15)",
            borderLeft: "1px solid var(--border)",
          }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* 01 Pool Purpose */}
              <div>
                <label style={labelStyle}><span style={{ color: "var(--gold)" }}>01</span> POOL PURPOSE</label>
                <input
                  type="text"
                  placeholder="Trip to Rome"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              {/* 02 Contributors */}
              <div>
                <label style={labelStyle}><span style={{ color: "var(--gold)" }}>02</span> CONTRIBUTORS</label>
                <div style={{ display: "flex", alignItems: "center", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                  <button type="button" onClick={() => setNumContributors(Math.max(1, numContributors - 1))}
                    style={{ padding: "12px 16px", background: "transparent", border: "none", color: "var(--gold)", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>−</button>
                  <input
                    type="number" min={1} max={255}
                    value={numContributors}
                    onChange={(e) => setNumContributors(Number(e.target.value))}
                    style={{ flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: "14px", textAlign: "center", outline: "none", fontFamily: "Inter, sans-serif" }}
                  />
                  <span style={{ padding: "0 12px", color: "var(--text-muted)", fontSize: "11px", fontFamily: "JetBrains Mono, monospace" }}>pax</span>
                  <button type="button" onClick={() => setNumContributors(Math.min(255, numContributors + 1))}
                    style={{ padding: "12px 16px", background: "transparent", border: "none", color: "var(--gold)", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
              </div>

              {/* 03 Per Person */}
              <div>
                <label style={labelStyle}><span style={{ color: "var(--gold)" }}>03</span> PER PERSON (USDC)</label>
                <div style={{ display: "flex", alignItems: "center", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                  <span style={{ padding: "12px 14px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace", fontSize: "14px" }}>$</span>
                  <input
                    type="number" min={1}
                    value={amountPerPerson}
                    onChange={(e) => setAmountPerPerson(Number(e.target.value))}
                    style={{ flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: "14px", padding: "12px 0", outline: "none", fontFamily: "Inter, sans-serif" }}
                  />
                  <span style={{ padding: "12px 14px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace", fontSize: "11px" }}>USDC</span>
                </div>
              </div>

              {/* 04 Total Goal (read-only) */}
              <div>
                <label style={labelStyle}><span style={{ color: "var(--gold)" }}>04</span> TOTAL POOL GOAL</label>
                <div style={{
                  background: "rgba(232,181,71,0.1)",
                  border: "1px solid rgba(232,181,71,0.4)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "var(--gold)",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "16px",
                  fontWeight: 700,
                }}>
                  ${goal.toLocaleString()} USDC
                </div>
              </div>

              {/* 05 Expiration Date */}
              <div>
                <label style={labelStyle}><span style={{ color: "var(--gold)" }}>05</span> EXPIRATION DATE</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  style={{ ...inputStyle, colorScheme: "dark" }}
                />
              </div>

              {/* Info note */}
              <p style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1.6,
                padding: "10px 14px",
                background: "rgba(0,0,0,0.15)",
                borderRadius: "8px",
                borderLeft: "2px solid var(--gold)",
              }}>
                Funds are locked in escrow until the goal is met or the deadline passes.
              </p>

              {/* Error */}
              {status === "error" && (
                <p style={{ fontSize: "13px", color: "#ff6b6b", background: "rgba(255,107,107,0.1)", padding: "10px 14px", borderRadius: "8px" }}>
                  {errorMsg}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!wallet.publicKey || busy}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: (!wallet.publicKey || busy) ? "rgba(232,181,71,0.4)" : "var(--gold)",
                  color: "#000",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: (!wallet.publicKey || busy) ? "not-allowed" : "pointer",
                  fontFamily: "Inter, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "opacity 0.2s",
                }}
              >
                ⚡ {
                  status === "signing"  ? "Waiting for signature..." :
                  status === "pending"  ? "Sending transaction..."   :
                  !wallet.publicKey     ? "Connect wallet first"     :
                  "Initialize Pool"
                }
              </button>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
