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
import Footer from "@/components/Footer";
import ErrorBanner from "@/components/ErrorBanner";
import { translateError, type TranslatedError } from "@/lib/errors";
import { recordContribution, getCreatorContributes } from "@/lib/history";
import {
  savePoolSnapshot,
  getPoolSnapshot,
  type PoolSnapshot,
} from "@/lib/poolSnapshots";
import { formatTimeLeft } from "@/lib/time";
import idl from "@/lib/idl.json";

const SHELL_OUTER_CLS =
  "flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12";
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
const REFUNDED_PILL =
  "rounded-full border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/12 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[color:var(--destructive)]";
// Gold CREATOR badge — left of the PAID/PENDING pill on the creator's row.
// Gold over green clashes less than green-on-green when the creator has paid.
const CREATOR_PILL =
  "rounded-full border border-gold/45 bg-gold/[0.08] px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-gold";

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
  // Count drops on phones — 50 bolts melt a low-end CPU and hide the card
  // contents anyway. Detect on mount; keeps SSR stable.
  const [count, setCount] = useState<number>(50);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 640px)").matches) setCount(8);
  }, []);
  // useState initializer runs once per instance; values stabilize after hydration.
  const [bolts, setBolts] = useState(() => generateBolts(50));
  useEffect(() => {
    setBolts(generateBolts(count));
  }, [count]);
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

function timeLeft(deadlineSec: number) {
  return formatTimeLeft(new Date(deadlineSec * 1000));
}

export default function PoolPage() {
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
  const USDC_MINT  = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
  const { address } = useParams<{ address: string }>();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [pool,          setPool]          = useState<PoolAccount | null>(null);
  const [contributions, setContributions] = useState<ContributionAccount[]>([]);
  const [snapshot,      setSnapshot]      = useState<PoolSnapshot | null>(null);
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

      // Merge live state into the local snapshot so refunds don't erase history.
      const merged = savePoolSnapshot({
        address: poolPda.toBase58(),
        raised: poolData.currentAmount.toNumber() / 1_000_000,
        goal: poolData.goal.toNumber() / 1_000_000,
        numContributors: poolData.numContributors,
        reason: poolData.reason,
        deadline: poolData.deadline.toNumber(),
        contributors: allContributions.map((c: ContributionAccount) => ({
          contributor: c.account.contributor.toBase58(),
          contributionPda: c.publicKey.toBase58(),
          amount: c.account.amount.toNumber() / 1_000_000,
        })),
      });
      setSnapshot(merged);

      // Resolve a representative on-chain signature for each contribution PDA.
      // For active contributions this is the contribute() tx (the PDA is
      // created by contribute and not touched until refund). For refunded
      // contributions the PDA is closed but the RPC still returns its history,
      // so the most-recent signature is the refund tx itself.
      try {
        const allPdas = Array.from(
          new Set([
            ...allContributions.map((c: ContributionAccount) => c.publicKey.toBase58()),
            ...merged.contributors.map((c) => c.contributionPda),
          ]),
        );
        const sigEntries = await Promise.all(
          allPdas.map(async (pdaBase58) => {
            try {
              const pk = new PublicKey(pdaBase58);
              const sigs = await connection.getSignaturesForAddress(pk, { limit: 1 });
              return [pdaBase58, sigs[0]?.signature ?? ""] as const;
            } catch {
              return [pdaBase58, ""] as const;
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
    if (poolPda) {
      const cached = getPoolSnapshot(poolPda.toBase58());
      if (cached) setSnapshot(cached);
    }
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

  const onchainProgressPct = pool
    ? Math.min(100, (pool.currentAmount.toNumber() / pool.goal.toNumber()) * 100)
    : 0;

  const amountUSDC = pool ? pool.amountPerPerson.toNumber() / 1_000_000 : 0;
  const onchainRaisedUSDC = pool ? pool.currentAmount.toNumber() / 1_000_000 : 0;
  const goalUSDC   = pool ? pool.goal.toNumber() / 1_000_000 : 0;
  // For missed pools (expired without hitting goal), preserve the high-water
  // mark from the snapshot so the UI doesn't show $0 raised after refunds.
  const missed = isExpired && !isGoalMet;
  const raisedUSDC = missed && snapshot
    ? Math.max(onchainRaisedUSDC, snapshot.raised)
    : onchainRaisedUSDC;
  const remainingUSDC = Math.max(0, goalUSDC - raisedUSDC);
  const progressPct = missed && goalUSDC > 0
    ? Math.min(100, (raisedUSDC / goalUSDC) * 100)
    : onchainProgressPct;

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
      if (poolPda) recordContribution(poolPda.toBase58());
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

    // Creator who's already paid — show the same confirmation as any other
    // contributor. (Checked before the catch-all isCreator branch so the
    // "Waiting for contributions..." state doesn't swallow it.)
    if (isCreator && hasContributed) return (
      <div className={`${infoBadgeCls} border-gold/40 bg-gold/[0.08] text-gold`}>
        ✓ You contributed {amountUSDC} USDC
      </div>
    );

    // Creator who opted to be one of the N contributors but hasn't paid yet.
    // Surface the Contribute button instead of the passive "waiting" state so
    // they can pay their share. The on-chain program permits this — there's
    // no creator-equality check on contribute().
    if (isCreator && creatorContributesFlag === true) return (
      <button onClick={contribute} disabled={busy} className={goldBtnCls}>
        <span aria-hidden className="text-[18px] leading-none">⚡</span>
        {label ?? `Contribute your share — ${amountUSDC} USDC →`}
      </button>
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
    <div className="flex min-h-screen flex-col">
      <Navbar sticky={false} />
      <div className={`${SHELL_OUTER_CLS} flex-1`}>
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
      <Footer />
    </div>
  );

  if (loadError || !pool) {
    const fallback: TranslatedError = loadError ?? {
      title: "Pool not found",
      message: "We couldn't find a pool at this address.",
      level: "error",
    };
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar sticky={false} />
        <div className={`${SHELL_OUTER_CLS} flex-1`}>
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
        <Footer />
      </div>
    );
  }

  // Unified contributor list. For missed pools we render the snapshot (so
  // entries that have refunded since are still visible), tagged PAID or
  // REFUNDED based on whether the on-chain contribution PDA still exists.
  type DisplayContributor = {
    contributor: string;
    contributionPda: string;
    amount: number;
    status: "paid" | "refunded" | "pending";
    txSig?: string;
    isCreator?: boolean;
  };
  const onchainPdaSet = new Set(contributions.map((c) => c.publicKey.toBase58()));
  const creatorAddr = pool.creator.toBase58();
  const baseDisplayContributors: DisplayContributor[] =
    missed && snapshot && snapshot.contributors.length > 0
      ? snapshot.contributors.map((c) => ({
          contributor: c.contributor,
          contributionPda: c.contributionPda,
          amount: c.amount,
          status: onchainPdaSet.has(c.contributionPda) ? "paid" : "refunded",
          txSig: txSigs[c.contributionPda],
          isCreator: c.contributor === creatorAddr,
        }))
      : contributions.map((c) => ({
          contributor: c.account.contributor.toBase58(),
          contributionPda: c.publicKey.toBase58(),
          amount: c.account.amount.toNumber() / 1_000_000,
          status: "paid",
          txSig: txSigs[c.publicKey.toBase58()],
          isCreator: c.account.contributor.toBase58() === creatorAddr,
        }));

  // Did the creator opt to be one of the N contributors? Persisted locally
  // when they used this device to create the pool. Visitors on other devices
  // get null and we fall back to "is the creator already in the contribution
  // list" — which still drives the Creator-badge / Created-by header logic.
  const creatorContributesFlag = poolPda
    ? getCreatorContributes(poolPda.toBase58())
    : null;
  const creatorAlreadyInList = baseDisplayContributors.some(
    (c) => c.contributor === creatorAddr,
  );
  // Synthesize a PENDING creator row only when:
  //   - we know the creator opted in (locally recorded), AND
  //   - they haven't paid yet, AND
  //   - the pool is still active (not missed/expired/closed).
  const shouldSynthesizeCreatorRow =
    creatorContributesFlag === true &&
    !creatorAlreadyInList &&
    !missed &&
    !isClosed;
  const displayContributors: DisplayContributor[] = shouldSynthesizeCreatorRow
    ? [
        {
          contributor: creatorAddr,
          contributionPda: `creator-pending-${creatorAddr}`,
          amount: amountUSDC,
          status: "pending",
          isCreator: true,
        },
        ...baseDisplayContributors,
      ]
    : baseDisplayContributors;
  // Show the "Created by" header line only when the creator definitely opted
  // out. Three signals: explicit local OFF, OR the creator is not in the
  // contributor list and we have no local record (best-effort heuristic for
  // visitors on other devices).
  const creatorOptedOut =
    creatorContributesFlag === false ||
    (creatorContributesFlag === null && !creatorAlreadyInList);
  const paidEverCount = baseDisplayContributors.filter(
    (c) => c.status === "paid",
  ).length;
  const pendingCount = missed
    ? 0
    : Math.max(
        0,
        pool.numContributors -
          contributions.length -
          (shouldSynthesizeCreatorRow ? 1 : 0),
      );
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
    <div className="flex min-h-screen flex-col">
      <Navbar sticky={false} />

      <div className={`${SHELL_OUTER_CLS} flex-1`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={shellCardCls}
        >
          <GoldBoltsCelebration active={celebrating} />
          <div className="relative z-0 p-4 sm:p-6 lg:p-8">

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
              <h1 className="mb-3 text-[clamp(28px,6vw,56px)] font-bold leading-[1.0] tracking-[-0.02em] text-cream">
                {pool.reason.split(" ").slice(0, -1).join(" ")}{" "}
                <em className="font-[family-name:var(--font-serif)] font-bold italic text-gold drop-shadow-[0_0_30px_rgba(232,181,71,0.35)]">
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
              {/* Created-by line — shown only when the creator opted out of
                  contributing, since otherwise their address appears in the
                  contributor list with a Creator badge. */}
              {creatorOptedOut && (
                <p
                  className={`${monoCls} mt-2 text-[11px] text-cream-muted/85`}
                >
                  Created by{" "}
                  <span className="text-gold">{truncate(creatorAddr)}</span>
                </p>
              )}
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
                  className={`relative rounded-2xl border bg-white/[0.05] px-4 py-3 transition-shadow sm:px-5 sm:py-4 ${s.className}`}
                >
                  <p className={`${monoCls} mb-1 text-[10px] uppercase tracking-[0.16em] text-cream-muted/85 sm:mb-1.5`}>
                    {s.label}
                  </p>
                  <p className={`${monoCls} text-[18px] font-bold leading-none text-gold sm:text-[22px]`}>
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
                  ${remainingUSDC.toLocaleString()}{" "}
                  {missed ? "short of goal" : "remaining to goal"}
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
                {missed
                  ? `Contributors — ${paidEverCount} of ${pool.numContributors} paid before deadline`
                  : `Contributors — ${contributions.length} of ${pool.numContributors} sent`}
              </p>
              <ul className="flex flex-col divide-y divide-[rgba(255,255,255,0.06)]">
                {displayContributors.map((c) => {
                  const addr = c.contributor;
                  const initials = addr.slice(0, 2).toUpperCase();
                  const sig = c.txSig;
                  const isMe = wallet.publicKey?.toBase58() === addr;
                  const isRefunded = c.status === "refunded";
                  const isPendingCreator = c.status === "pending";
                  const statusPillCls = isRefunded
                    ? REFUNDED_PILL
                    : isPendingCreator
                    ? PENDING_PILL
                    : PAID_PILL;
                  const statusPillLabel = isRefunded
                    ? "REFUNDED"
                    : isPendingCreator
                    ? "PENDING"
                    : "PAID";
                  return (
                    <li
                      key={c.contributionPda}
                      className={`flex items-center gap-3 px-3 py-3 -mx-3 rounded-lg transition-colors first:pt-0 ${
                        isMe
                          ? "bg-gold/[0.14] ring-1 ring-gold/30 hover:bg-gold/[0.18]"
                          : "hover:bg-white/[0.02]"
                      } ${isRefunded ? "opacity-80" : ""} ${isPendingCreator ? "opacity-90" : ""}`}
                    >
                      <div className={`${monoCls} flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-gold ${
                        isMe ? "bg-gold/45 ring-1 ring-gold/50" : "bg-gold/[0.18]"
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-cream">
                          {truncate(addr)}
                          {isMe && (
                            <span className={`${monoCls} ml-2 text-[10px] uppercase tracking-[0.1em] text-gold/80`}>
                              You
                            </span>
                          )}
                        </p>
                        <p className={`${monoCls} flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-cream-muted`}>
                          <span>${c.amount} USDC</span>
                          {sig && (
                            <>
                              <span className="text-cream-muted/40">·</span>
                              <a
                                href={`https://solscan.io/tx/${sig}?cluster=devnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gold/70 transition-colors hover:text-gold"
                              >
                                {isRefunded ? "View refund tx ↗" : "View tx ↗"}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {c.isCreator && (
                          <span className={`${monoCls} ${CREATOR_PILL}`}>
                            CREATOR
                          </span>
                        )}
                        <span className={`${monoCls} ${statusPillCls}`}>
                          {statusPillLabel}
                        </span>
                      </div>
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

            {/* Bottom actions — stack on phones, side-by-side from sm+ */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyLink}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-gold/30 bg-white/[0.03] px-5 py-3.5 text-[14px] font-semibold text-cream transition-all duration-200 hover:border-gold/60 hover:bg-gold/[0.08] hover:text-gold"
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

      <Footer />
    </div>
  );
}
