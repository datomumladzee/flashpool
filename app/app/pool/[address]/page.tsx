"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import ErrorBanner from "@/components/ErrorBanner";
import { translateError, type TranslatedError } from "@/lib/errors";
import idl from "@/lib/idl.json";

const SHELL_OUTER_CLS =
  "flex items-center justify-center px-6 py-12 sm:px-8 md:py-16 lg:px-12";
const SHELL_CARD_BASE =
  "relative w-full max-w-xl overflow-hidden rounded-3xl bg-gradient-to-b from-[color:var(--red-card)] to-[color:var(--red-input)]";
const SHELL_CARD_DEFAULT =
  "border border-[rgba(232,181,71,0.16)] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.75),_inset_0_1px_0_0_rgba(255,255,255,0.04)]";
const SHELL_CARD_GOAL =
  "border border-gold/45 shadow-[0_40px_120px_-20px_rgba(232,181,71,0.45),_0_0_60px_-20px_rgba(232,181,71,0.6),_inset_0_1px_0_0_rgba(255,255,255,0.06)]";
const SHELL_CARD_CLS = `${SHELL_CARD_BASE} ${SHELL_CARD_DEFAULT}`;

const monoCls = "font-[family-name:var(--font-mono-jb)]";
// Lighter inner sections so they read as elevated above the deeper outer card.
const statCardCls =
  "rounded-2xl border border-[color:var(--border)] bg-white/[0.05] px-5 py-4";
const goldBtnCls =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-4 text-[16px] font-bold text-[#1a0e0e] shadow-[0_18px_40px_-16px_rgba(232,181,71,0.7)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_26px_60px_-14px_rgba(232,181,71,0.95)] disabled:cursor-not-allowed disabled:bg-gold/40 disabled:shadow-none disabled:hover:scale-100";
const goldChipCls =
  "inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-4 text-[16px] font-bold text-[#1a0e0e] shadow-[0_18px_40px_-16px_rgba(232,181,71,0.7)]";
const infoBadgeCls =
  `${monoCls} flex w-full items-center justify-center rounded-2xl border border-[color:var(--border)] bg-white/[0.04] px-5 py-4 text-[13px] text-cream-muted`;

// Brand-green PAID pill — only place a non-token color is allowed per design spec.
const PAID_PILL =
  "rounded-full border border-[#5fbf7f]/35 bg-[#5fbf7f]/15 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[#7fd99f]";
const PENDING_PILL =
  "rounded-full border border-[color:var(--border)] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-cream-muted";

type Bolt = { id: number; left: number; delay: number; size: number; rotate: number };
function generateBolts(count: number): Bolt[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 86 + 7,
    delay: Math.random() * 0.45,
    size: 18 + Math.random() * 12,
    rotate: Math.random() * 30 - 15,
  }));
}

// Goal-reached celebration. Default: lightning bolts falling from top, fading
// near the bottom, staggered ~2s. Brand-fitting alternatives if this feels too
// literal:
//   - diagonal gold shimmer sweep across the outer card
//   - pulsing gold halo radiating from the progress bar
//   - radial confetti bolts from the center pool
function GoldBoltsCelebration({ active }: { active: boolean }) {
  // useState initializer runs once per instance; values stabilize after hydration.
  const [bolts] = useState(() => generateBolts(50));
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      
      {bolts.map((b) => (
        <motion.div
          key={b.id}
          initial={{ y: -40, opacity: 0, rotate: b.rotate }}
          animate={{ y: "100vh", opacity: [0, 0.55, 0.55, 0] }}
          transition={{
            duration: 2,
            ease: "easeIn",
            delay: b.delay,
            times: [0, 0.12, 0.85, 1],
          }}
          className="absolute drop-shadow-[0_0_8px_rgba(232,181,71,0.7)]"
          style={{ left: `${b.left}%`, top: 0 }}
        >
          <Zap size={b.size} color="#E8B547" fill="#E8B547" strokeWidth={1.5} />
        </motion.div>
      ))}
    </div>
  );
}



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
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
  const USDC_MINT  = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
  const { address } = useParams<{ address: string }>();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [pool,          setPool]          = useState<PoolAccount | null>(null);
  const [contributions, setContributions] = useState<ContributionAccount[]>([]);
  // Map of contribution PDA (base58) → its on-chain creation tx signature.
  const [txSigs,        setTxSigs]        = useState<Record<string, string>>({});
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState<TranslatedError | null>(null);
  const [txStatus,      setTxStatus]      = useState<TxStatus>("idle");
  const [actionError,   setActionError]   = useState<TranslatedError | null>(null);
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

      // Resolve the real on-chain contribute-tx signature for each contribution
      // PDA. The PDA is created by the contribute() ix and not touched again
      // until refund (which closes it), so the most-recent signature is the
      // contribute tx for any contribution we still see here.
      try {
        const sigEntries = await Promise.all(
          allContributions.map(async (c: ContributionAccount) => {
            try {
              const sigs = await connection.getSignaturesForAddress(
                c.publicKey,
                { limit: 1 },
              );
              return [c.publicKey.toBase58(), sigs[0]?.signature ?? ""] as const;
            } catch {
              return [c.publicKey.toBase58(), ""] as const;
            }
          }),
        );
        setTxSigs(
          Object.fromEntries(sigEntries.filter(([, sig]) => sig)),
        );
      } catch {
        // Non-fatal — link just won't render for contributions we couldn't resolve.
      }
    } catch (e: unknown) {
      setLoadError(translateError(e));
    } finally {
      setLoading(false);
    }
  }, [poolPda, readProgram, connection]);

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

  // one-time celebration when goal flips reached
  const [celebrating, setCelebrating] = useState(false);
  const prevGoalReachedRef = useRef(false);
  useEffect(() => {
    const reached = pool ? pool.currentAmount.gte(pool.goal) : false;
    if (reached && !prevGoalReachedRef.current) {
      setCelebrating(true);
      prevGoalReachedRef.current = true;
      const t = setTimeout(() => setCelebrating(false), 2300);
      return () => clearTimeout(t);
    }
    if (!reached) prevGoalReachedRef.current = false;
  }, [pool]);

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
    setTxStatus("signing"); setActionError(null);
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
    } catch (e: unknown) {
      const translated = translateError(e);
      setTxStatus(translated.level === "info" ? "idle" : "error");
      setActionError(translated);
    }
  }

  async function withdraw() {
    if (!program || !wallet.publicKey || !pool || !poolPda) return;
    setTxStatus("signing"); setActionError(null);
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
    } catch (e: unknown) {
      const translated = translateError(e);
      setTxStatus(translated.level === "info" ? "idle" : "error");
      setActionError(translated);
    }
  }

  async function refund() {
    if (!program || !wallet.publicKey || !pool || !poolPda || !myContribution) return;
    setTxStatus("signing"); setActionError(null);
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
    } catch (e: unknown) {
      const translated = translateError(e);
      setTxStatus(translated.level === "info" ? "idle" : "error");
      setActionError(translated);
    }
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
      <div className={infoBadgeCls}>Pool closed — funds settled</div>
    );

    if (isGoalMet && isCreator) return (
      <button onClick={withdraw} disabled={busy} className={goldBtnCls}>
        <span aria-hidden className="text-[18px] leading-none">⚡</span>
        {label ?? "Withdraw Funds"}
      </button>
    );

    if (isGoalMet && !isCreator) return (
      <div className={goldChipCls}>
        <span aria-hidden className="text-[18px] leading-none">⚡</span>
        Goal reached — funds released
      </div>
    );

    if (isExpired && !isGoalMet && hasContributed) return (
      <button onClick={refund} disabled={busy} className={goldBtnCls}>
        <span aria-hidden className="text-[18px] leading-none">↩</span>
        {label ?? `Refund ${amountUSDC} USDC`}
      </button>
    );

    if (isExpired && isCreator) return (
      <div className={infoBadgeCls}>Pool expired — contributors can refund</div>
    );

    if (isExpired) return (
      <div className={infoBadgeCls}>Pool expired</div>
    );

    if (isCreator) return (
      <div className={infoBadgeCls}>Waiting for contributions...</div>
    );

    if (hasContributed) return (
      <div className={`${infoBadgeCls} border-gold/40 bg-gold/[0.08] text-gold`}>
        ✓ You contributed {amountUSDC} USDC
      </div>
    );

    if (!wallet.publicKey) return (
      <div className={infoBadgeCls}>Connect your wallet to contribute</div>
    );

    return (
      <button onClick={contribute} disabled={busy} className={goldBtnCls}>
        <span aria-hidden className="text-[18px] leading-none">⚡</span>
        {label ?? `Contribute ${amountUSDC} USDC →`}
      </button>
    );
  }

  // ── render ──
  if (loading) return (
    <div className="min-h-screen">
      <Navbar sticky={false} />
      <div className={SHELL_OUTER_CLS}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={SHELL_CARD_CLS}
        >
          <div className="flex items-center justify-center p-6 lg:p-8 min-h-[40vh] text-cream-muted">
            Loading pool...
          </div>
        </motion.div>
      </div>
    </div>
  );

  if (loadError || !pool) {
    const fallback: TranslatedError = loadError ?? {
      title: "Pool not found",
      message: "We couldn't find a pool at this address.",
      level: "error",
    };
    return (
      <div className="min-h-screen">
        <Navbar sticky={false} />
        <div className={SHELL_OUTER_CLS}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className={SHELL_CARD_CLS}
          >
            <div className="p-6 lg:p-8">
              <ErrorBanner
                variant={fallback.level}
                title={fallback.title}
                message={fallback.message}
                action={fallback.action ?? { label: "Try again", onClick: () => fetchPool() }}
                raw={fallback.raw}
              />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const pendingCount = pool.numContributors - contributions.length;
  const timeLeftSec = pool.deadline.toNumber() - now;
  const urgent = !isExpired && timeLeftSec > 0 && timeLeftSec < 86_400;
  const raisedGrowing = progressPct > 0;
  const goalReached = isGoalMet;
  const shellCardCls = `${SHELL_CARD_BASE} ${
    goalReached ? SHELL_CARD_GOAL : SHELL_CARD_DEFAULT
  }`;
  const raisedCardCls = goalReached
    ? "border-gold/60 shadow-[inset_0_0_30px_-4px_rgba(232,181,71,0.55),_0_0_24px_-4px_rgba(232,181,71,0.45)]"
    : raisedGrowing
    ? "border-gold/40 shadow-[inset_0_0_30px_-8px_rgba(232,181,71,0.45)]"
    : "border-[color:var(--border)]";
  const timeCardCls = urgent
    ? "border-gold/40 shadow-[inset_0_0_30px_-8px_rgba(232,181,71,0.45)]"
    : "border-[color:var(--border)]";

  return (
    <div className="min-h-screen">
      <Navbar sticky={false} />

      <div className={SHELL_OUTER_CLS}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={shellCardCls}
        >
          <GoldBoltsCelebration active={celebrating} />
          <div className="relative z-0 p-5 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="mb-7">
              <p className={`${monoCls} mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gold`}>
                {!isClosed && !isExpired && !goalReached && (
                  <span className="relative flex size-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-60" />
                    <span className="relative size-1.5 rounded-full bg-gold" />
                  </span>
                )}
                {isClosed
                  ? "Closed pool"
                  : goalReached
                  ? "Goal reached"
                  : isExpired
                  ? "Expired pool"
                  : "Active pool"}
              </p>
              <h1 className="mb-3 text-[clamp(36px,5vw,56px)] font-bold leading-[1.0] tracking-[-0.02em] text-cream">
                {pool.reason.split(" ").slice(0, -1).join(" ")}{" "}
                <em className="font-[family-name:var(--font-playfair)] font-bold italic text-gold drop-shadow-[0_0_30px_rgba(232,181,71,0.35)]">
                  {pool.reason.split(" ").slice(-1)[0]}
                </em>
              </h1>
              <div className={`${monoCls} flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-cream-muted`}>
                <span>{truncate(poolPda!.toBase58())}</span>
                <a
                  href={`https://solscan.io/account/${poolPda!.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold transition-colors hover:text-gold-dark"
                >
                  View on Solscan ↗
                </a>
              </div>
            </div>

            {/* Stat cards */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { key: "raised", label: "Raised",    value: `$${raisedUSDC.toLocaleString()}`, sub: "USDC", className: raisedCardCls },
                { key: "goal",   label: "Goal",      value: `$${goalUSDC.toLocaleString()}`,   sub: "USDC", className: "border-[color:var(--border)]" },
                { key: "time",   label: "Time left", value: timeLeft(pool.deadline.toNumber()), sub: "",     className: timeCardCls },
              ].map((s) => (
                <div
                  key={s.key}
                  className={`relative rounded-2xl border bg-white/[0.05] px-5 py-4 transition-shadow ${s.className}`}
                >
                  <p className={`${monoCls} mb-1.5 text-[10px] uppercase tracking-[0.16em] text-cream-muted/85`}>
                    {s.label}
                  </p>
                  <p className={`${monoCls} text-[22px] font-bold leading-none text-gold`}>
                    {s.value}
                    {s.sub && <span className="ml-1 text-[11px] text-cream-muted">{s.sub}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className={`${statCardCls} mb-5`}>
              <div className="mb-2.5 flex justify-between">
                <span className="text-[13px] text-cream-muted">
                  ${remainingUSDC.toLocaleString()} remaining to goal
                </span>
                <span className={`${monoCls} text-[13px] font-bold text-gold`}>
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-black/40">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                  className="h-full rounded-full bg-gradient-to-r from-[color:var(--gold-dark)] to-[color:var(--gold)]"
                  style={progressPct > 0 ? { boxShadow: "0 0 18px rgba(232,181,71,0.55)" } : undefined}
                />
              </div>
              <div className={`${monoCls} mt-1.5 flex justify-between text-[9px] text-cream-muted/80`}>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <span key={f}>${(goalUSDC * f).toLocaleString()}</span>
                ))}
              </div>
            </div>

            {/* Contributors */}
            <div className={`${statCardCls} mb-5`}>
              <p className={`${monoCls} mb-4 text-[11px] uppercase tracking-[0.16em] text-cream-muted/85`}>
                Contributors — {contributions.length} of {pool.numContributors} sent
              </p>
              <ul className="flex flex-col divide-y divide-[rgba(255,255,255,0.06)]">
                {contributions.map((c) => {
                  const addr = c.account.contributor.toBase58();
                  const initials = addr.slice(0, 2).toUpperCase();
                  const sig = txSigs[c.publicKey.toBase58()];
                  const isMe = wallet.publicKey?.toBase58() === addr;
                  return (
                    <li
                      key={addr}
                      className={`flex items-center gap-3 px-3 py-3 -mx-3 rounded-lg transition-colors first:pt-0 ${
                        isMe
                          ? "bg-gold/[0.14] ring-1 ring-gold/30 hover:bg-gold/[0.18]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className={`${monoCls} flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-gold ${
                        isMe ? "bg-gold/45 ring-1 ring-gold/50" : "bg-gold/[0.18]"
                      }`}>
                        {initials}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-cream">
                          {truncate(addr)}
                          {isMe && (
                            <span className={`${monoCls} ml-2 text-[10px] uppercase tracking-[0.1em] text-gold/80`}>
                              You
                            </span>
                          )}
                        </p>
                        <p className={`${monoCls} flex items-center gap-2 text-[11px] text-cream-muted`}>
                          <span>${c.account.amount.toNumber() / 1_000_000} USDC</span>
                          {sig && (
                            <>
                              <span className="text-cream-muted/40">·</span>
                              <a
                                href={`https://solscan.io/tx/${sig}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold/70 transition-colors hover:text-gold"
                              >
                                View tx ↗
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <span className={`${monoCls} ${PAID_PILL}`}>PAID</span>
                    </li>
                  );
                })}
                {Array.from({ length: pendingCount }).map((_, i) => (
                  <li
                    key={`pending-${i}`}
                    className="flex items-center gap-3 py-3 opacity-70 transition-opacity first:pt-0 hover:opacity-100"
                  >
                    <div className={`${monoCls} flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[12px] text-cream-muted`}>
                      ?
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-cream-muted">Awaiting payment</p>
                      <p className={`${monoCls} text-[11px] text-cream-muted/85`}>
                        ${amountUSDC} USDC
                      </p>
                    </div>
                    <span className={`${monoCls} ${PENDING_PILL}`}>PENDING</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action error */}
            {actionError && (
              <div className="mb-3">
                <ErrorBanner
                  variant={actionError.level}
                  title={actionError.title}
                  message={actionError.message}
                  action={actionError.action}
                  raw={actionError.raw}
                  onDismiss={() => setActionError(null)}
                />
              </div>
            )}

            {/* Bottom actions */}
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className="rounded-2xl border border-gold/30 bg-white/[0.03] px-5 py-3.5 text-[14px] font-semibold text-cream transition-all duration-200 hover:border-gold/60 hover:bg-gold/[0.08] hover:text-gold"
              >
                {copied ? "✓ Copied" : "Share link"}
              </button>
              <div className="flex-1">
                <ActionButton />
              </div>
            </div>

            <p className={`${monoCls} mt-4 flex items-center justify-center gap-2 text-[11px] text-cream-muted/85`}>
              <Lock className="size-3" strokeWidth={2} />
              Funds held in smart contract escrow · non-custodial
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
