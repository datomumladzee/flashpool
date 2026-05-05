"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import Navbar from "@/components/Navbar";
import idl from "@/lib/idl.json";

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
const USDC_MINT  = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

interface PoolAccount {
  creator: PublicKey;
  poolIndex: BN;
  reason: string;
  numContributors: number;
  amountPerPerson: BN;
  goal: BN;
  currentAmount: BN;
  deadline: BN;
  withdrawn: boolean;
  mint: PublicKey;
  bump: number;
}

interface ContributionAccount {
  publicKey: PublicKey;
  account: { contributor: PublicKey; pool: PublicKey; amount: BN; bump: number };
}

type TxStatus = "idle" | "signing" | "pending" | "success" | "error";

function truncate(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function timeLeft(deadline: number) {
  const diff = deadline - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Expired";
  if (diff < 3600) return `${Math.floor(diff / 60)}m left`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h left`;
  return `${Math.floor(diff / 86400)}d left`;
}

export default function PoolPage() {
  const { address } = useParams<{ address: string }>();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [pool,          setPool]          = useState<PoolAccount | null>(null);
  const [contributions, setContributions] = useState<ContributionAccount[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [txStatus,      setTxStatus]      = useState<TxStatus>("idle");
  const [txError,       setTxError]       = useState("");
  const [copied,        setCopied]        = useState(false);
  const [now,           setNow]           = useState(Math.floor(Date.now() / 1000));

  const poolPda = useMemo(() => {
    try { return new PublicKey(address); } catch { return null; }
  }, [address]);

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  // read-only program (no wallet needed for fetching)
  const readProgram = useMemo(() => {
    const provider = new AnchorProvider(connection, {} as any, { commitment: "confirmed" });
    return new Program(idl as any, provider);
  }, [connection]);

  const fetchPool = useCallback(async () => {
    if (!poolPda) return;
    try {
      const poolData = await (readProgram.account as any).pool.fetch(poolPda) as PoolAccount;
      setPool(poolData);

      const allContributions = await (readProgram.account as any).contribution.all([
        { memcmp: { offset: 8, bytes: poolPda.toBase58() } },
      ]);
      setContributions(allContributions);
    } catch (e: any) {
      setError("Pool not found or failed to load.");
    } finally {
      setLoading(false);
    }
  }, [poolPda, readProgram]);

  // initial fetch + live subscription
  useEffect(() => {
    fetchPool();
    if (!poolPda) return;
    const id = connection.onAccountChange(poolPda, () => fetchPool(), "confirmed");
    return () => { connection.removeAccountChangeListener(id); };
  }, [poolPda, connection, fetchPool]);

  // tick clock every second for countdown
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // ── derived state ──
  const isExpired    = pool ? now >= pool.deadline.toNumber() : false;
  const isGoalMet    = pool ? pool.currentAmount.gte(pool.goal) : false;
  const isClosed     = pool?.withdrawn ?? false;
  const isCreator    = pool && wallet.publicKey
    ? pool.creator.toBase58() === wallet.publicKey.toBase58()
    : false;
  const myContribution = wallet.publicKey
    ? contributions.find(c => c.account.contributor.toBase58() === wallet.publicKey!.toBase58())
    : null;
  const hasContributed = !!myContribution;

  const progressPct = pool
    ? Math.min(100, (pool.currentAmount.toNumber() / pool.goal.toNumber()) * 100)
    : 0;

  const amountUSDC = pool ? pool.amountPerPerson.toNumber() / 1_000_000 : 0;
  const raisedUSDC = pool ? pool.currentAmount.toNumber() / 1_000_000 : 0;
  const goalUSDC   = pool ? pool.goal.toNumber() / 1_000_000 : 0;
  const remainingUSDC = goalUSDC - raisedUSDC;

  // ── actions ──
  async function contribute() {
    if (!program || !wallet.publicKey || !pool || !poolPda) return;
    setTxStatus("signing"); setTxError("");
    try {
      const [contributionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("contribution"), poolPda.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const poolVault             = await getAssociatedTokenAddress(USDC_MINT, poolPda, true);
      const contributorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      setTxStatus("pending");
      await program.methods.contribute()
        .accounts({
          contributor: wallet.publicKey,
          pool: poolPda,
          contributorTokenAccount,
          poolVault,
          contribution: contributionPda,
          mint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxStatus("success");
      await fetchPool();
    } catch (e: any) { setTxStatus("error"); setTxError(e?.message ?? "Failed"); }
  }

  async function withdraw() {
    if (!program || !wallet.publicKey || !pool || !poolPda) return;
    setTxStatus("signing"); setTxError("");
    try {
      const poolVault          = await getAssociatedTokenAddress(USDC_MINT, poolPda, true);
      const creatorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      setTxStatus("pending");
      await program.methods.withdraw()
        .accounts({
          creator: wallet.publicKey,
          pool: poolPda,
          poolVault,
          creatorTokenAccount,
          mint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      setTxStatus("success");
      await fetchPool();
    } catch (e: any) { setTxStatus("error"); setTxError(e?.message ?? "Failed"); }
  }

  async function refund() {
    if (!program || !wallet.publicKey || !pool || !poolPda || !myContribution) return;
    setTxStatus("signing"); setTxError("");
    try {
      const [contributionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("contribution"), poolPda.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const poolVault               = await getAssociatedTokenAddress(USDC_MINT, poolPda, true);
      const contributorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey);
      setTxStatus("pending");
      await program.methods.refund()
        .accounts({
          contributor: wallet.publicKey,
          pool: poolPda,
          poolVault,
          contributorTokenAccount,
          contribution: contributionPda,
          mint: USDC_MINT,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      setTxStatus("success");
      await fetchPool();
    } catch (e: any) { setTxStatus("error"); setTxError(e?.message ?? "Failed"); }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── action button ──
  function ActionButton() {
    const busy = txStatus === "signing" || txStatus === "pending";
    const label = txStatus === "signing" ? "Waiting for signature..."
                : txStatus === "pending"  ? "Sending transaction..."
                : null;

    if (isClosed) return (
      <div style={infoBadge}>Pool closed — funds settled</div>
    );

    if (isGoalMet && isCreator) return (
      <button onClick={withdraw} disabled={busy} style={goldBtn}>
        {label ?? "⚡ Withdraw Funds"}
      </button>
    );

    if (isGoalMet && !isCreator) return (
      <div style={{ ...infoBadge, borderColor: "var(--gold)", color: "var(--gold)" }}>
        🎉 Goal reached! Waiting for creator to withdraw.
      </div>
    );

    if (isExpired && !isGoalMet && hasContributed) return (
      <button onClick={refund} disabled={busy} style={goldBtn}>
        {label ?? `↩ Refund ${amountUSDC} USDC`}
      </button>
    );

    if (isExpired && isCreator) return (
      <div style={infoBadge}>Pool expired — contributors can refund</div>
    );

    if (isExpired) return (
      <div style={infoBadge}>Pool expired</div>
    );

    if (isCreator) return (
      <div style={infoBadge}>Waiting for contributions...</div>
    );

    if (hasContributed) return (
      <div style={{ ...infoBadge, borderColor: "var(--gold)", color: "var(--gold)" }}>
        ✓ You contributed {amountUSDC} USDC
      </div>
    );

    if (!wallet.publicKey) return (
      <div style={infoBadge}>Connect your wallet to contribute</div>
    );

    return (
      <button onClick={contribute} disabled={busy} style={goldBtn}>
        {label ?? `Contribute ${amountUSDC} USDC →`}
      </button>
    );
  }

  // ── styles ──
  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
    padding: "20px 24px",
  };

  const goldBtn: React.CSSProperties = {
    width: "100%",
    padding: "16px",
    background: "var(--gold)",
    color: "#000",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  };

  const infoBadge: React.CSSProperties = {
    width: "100%",
    padding: "14px 20px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    fontSize: "14px",
    color: "var(--text-muted)",
    textAlign: "center",
    fontFamily: "Inter, sans-serif",
  };

  // ── render ──
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", color: "var(--text-muted)" }}>
        Loading pool...
      </div>
    </div>
  );

  if (error || !pool) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", color: "#ff6b6b" }}>
        {error || "Pool not found"}
      </div>
    </div>
  );

  const pendingCount = pool.numContributors - contributions.length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "8px" }}>
            {isClosed ? "CLOSED POOL" : isExpired ? "EXPIRED POOL" : "ACTIVE POOL"}
          </p>
          <h1 style={{ fontSize: "40px", fontWeight: 700, color: "var(--text)", lineHeight: 1.1, marginBottom: "10px", fontFamily: "Inter, sans-serif" }}>
            {pool.reason.split(" ").slice(0, -1).join(" ")}{" "}
            <em style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "var(--gold)" }}>
              {pool.reason.split(" ").slice(-1)[0]}
            </em>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--text-muted)" }}>
              {truncate(poolPda!.toBase58())}
            </span>
            <a
              href={`https://solscan.io/account/${poolPda!.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--gold)", textDecoration: "none" }}
            >
              View on Solscan ↗
            </a>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "RAISED",    value: `$${raisedUSDC.toLocaleString()}`, sub: "USDC" },
            { label: "GOAL",      value: `$${goalUSDC.toLocaleString()}`,   sub: "USDC" },
            { label: "TIME LEFT", value: timeLeft(pool.deadline.toNumber()), sub: "" },
          ].map((s) => (
            <div key={s.label} style={card}>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "6px" }}>{s.label}</p>
              <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "22px", fontWeight: 700, color: "var(--gold)" }}>
                {s.value}
                {s.sub && <span style={{ fontSize: "11px", marginLeft: "4px", color: "var(--text-muted)" }}>{s.sub}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ ...card, marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              ${remainingUSDC.toLocaleString()} remaining to goal
            </span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "var(--gold)", fontWeight: 700 }}>
              {Math.round(progressPct)}%
            </span>
          </div>
          <div style={{ height: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progressPct}%`,
              background: "var(--gold)",
              borderRadius: "4px",
              transition: "width 0.5s ease",
            }} />
          </div>
          {/* Scale */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <span key={f} style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "var(--text-muted)" }}>
                ${(goalUSDC * f).toLocaleString()}
              </span>
            ))}
          </div>
        </div>

        {/* Contributors list */}
        <div style={{ ...card, marginBottom: "20px" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: "16px" }}>
            CONTRIBUTORS — {contributions.length} OF {pool.numContributors} SENT
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {contributions.map((c) => {
              const addr = c.account.contributor.toBase58();
              const initials = addr.slice(0, 2).toUpperCase();
              return (
                <div key={addr} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: "rgba(232,181,71,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "JetBrains Mono, monospace", fontSize: "12px", fontWeight: 700, color: "var(--gold)",
                    flexShrink: 0,
                  }}>{initials}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{truncate(addr)}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                      ${c.account.amount.toNumber() / 1_000_000} USDC
                    </p>
                  </div>
                  <span style={{
                    padding: "3px 10px", borderRadius: "20px",
                    background: "rgba(0,200,100,0.15)", color: "#00c864",
                    fontSize: "11px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
                  }}>PAID</span>
                </div>
              );
            })}

            {Array.from({ length: pendingCount }).map((_, i) => (
              <div key={`pending-${i}`} style={{ display: "flex", alignItems: "center", gap: "12px", opacity: 0.5 }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--text-muted)",
                  flexShrink: 0,
                }}>?</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Awaiting payment</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace" }}>
                    ${amountUSDC} USDC
                  </p>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: "20px",
                  background: "rgba(255,255,255,0.05)", color: "var(--text-muted)",
                  fontSize: "11px", fontFamily: "JetBrains Mono, monospace", fontWeight: 700,
                }}>PENDING</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {txStatus === "error" && (
          <p style={{ fontSize: "13px", color: "#ff6b6b", background: "rgba(255,107,107,0.1)", padding: "12px 16px", borderRadius: "8px", marginBottom: "12px" }}>
            {txError}
          </p>
        )}

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={copyLink} style={{
            padding: "14px 20px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            color: "var(--text)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
            whiteSpace: "nowrap",
          }}>
            {copied ? "✓ Copied!" : "Share link"}
          </button>
          <div style={{ flex: 1 }}>
            <ActionButton />
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", fontFamily: "JetBrains Mono, monospace", marginTop: "16px" }}>
          Funds held in smart contract escrow · non-custodial
        </p>

      </div>
    </div>
  );
}
