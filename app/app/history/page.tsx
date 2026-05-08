"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, RefreshCw, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCreatedPools, getContributedPools, forgetPool } from "@/lib/history";
import { getPoolSnapshot } from "@/lib/poolSnapshots";
import { formatEndsIn } from "@/lib/time";
import idl from "@/lib/idl.json";

type Tab = "mine" | "contributed";
type StatusFilter = "all" | "live" | "past";
type Status = "live" | "reached" | "missed";

type PoolView = {
  address: string;
  name: string;
  raised: number;
  goal: number;
  contributors: number;
  contributorsCap: number;
  deadline: number;
  createdByMe: boolean;
  contributedByMe: boolean;
  closedEarly: boolean;
};

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
  cancelRequestedAt: BN;
  closeVotes: number;
  closedEarly: boolean;
}

function classifyPool(pool: PoolView, nowSec: number): Status {
  const goalReached = pool.raised >= pool.goal;
  const expired = nowSec >= pool.deadline;
  if (goalReached) return "reached";
  // Treat early-closed pools as "missed" — same red styling, same "past"
  // filter bucket. The pool didn't reach its goal and is now refundable.
  if (expired || pool.closedEarly) return "missed";
  return "live";
}

function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

function formatTimeLeft(deadlineSec: number, nowSec: number, status: Status): string {
  if (status !== "live") {
    const elapsed = Math.max(0, nowSec - deadlineSec);
    const days = Math.floor(elapsed / 86_400);
    const hours = Math.floor((elapsed % 86_400) / 3600);
    if (days >= 1) return `ended ${days} day${days === 1 ? "" : "s"} ago`;
    if (hours >= 1) return `ended ${hours} hour${hours === 1 ? "" : "s"} ago`;
    return "ended just now";
  }
  return formatEndsIn(new Date(deadlineSec * 1000));
}

const STATUS_PILL_LIVE =
  "rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-gold";
const STATUS_PILL_REACHED =
  "rounded-full border border-[#5fbf7f]/40 bg-[#5fbf7f]/15 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-[#7fd99f]";
const STATUS_PILL_MISSED =
  "rounded-full border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/12 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.1em] text-[color:var(--destructive)]";

const CARD_BASE =
  "group relative flex h-full cursor-pointer flex-col gap-3.5 overflow-hidden rounded-2xl border bg-gradient-to-b from-[color:var(--red-card)] to-[color:var(--red-input)] p-4 shadow-[0_18px_48px_-26px_rgba(0,0,0,0.6),_inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-[2px] sm:gap-4 sm:p-5";
const CARD_LIVE =
  "border-[rgba(232,181,71,0.2)] hover:border-gold/45 hover:shadow-[0_30px_60px_-24px_rgba(0,0,0,0.7),_inset_0_1px_0_0_rgba(255,255,255,0.06)]";
const CARD_REACHED =
  "border-[#5fbf7f]/35 shadow-[0_24px_60px_-22px_rgba(95,191,127,0.45),_inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-[#5fbf7f]/55 hover:shadow-[0_32px_72px_-22px_rgba(95,191,127,0.6),_inset_0_1px_0_0_rgba(255,255,255,0.06)]";
const CARD_MISSED =
  "border-[color:var(--destructive)]/30 shadow-[0_22px_56px_-22px_rgba(255,107,107,0.4),_inset_0_1px_0_0_rgba(255,255,255,0.04)] hover:border-[color:var(--destructive)]/50 hover:shadow-[0_30px_70px_-22px_rgba(255,107,107,0.55),_inset_0_1px_0_0_rgba(255,255,255,0.05)]";

function PoolCard({
  pool,
  nowSec,
  tab,
  onDelete,
}: {
  pool: PoolView;
  nowSec: number;
  tab: Tab;
  onDelete: (address: string) => void;
}) {
  const router = useRouter();
  const status = classifyPool(pool, nowSec);
  const progressPct = Math.min(100, Math.round((pool.raised / pool.goal) * 100));
  const cardCls =
    status === "reached"
      ? `${CARD_BASE} ${CARD_REACHED}`
      : status === "missed"
        ? `${CARD_BASE} ${CARD_MISSED}`
        : `${CARD_BASE} ${CARD_LIVE}`;
  const desaturate = status === "missed" ? "opacity-[0.85]" : "";

  return (
    <motion.div
      layout
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/pool/${pool.address}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/pool/${pool.address}`);
        }
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cardCls}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`min-w-0 flex-1 ${desaturate}`}>
          <h3 className="truncate text-[16px] font-bold leading-tight text-cream">
            {pool.name}
          </h3>
          <p className="mt-1 font-[family-name:var(--font-mono-jb)] text-[11px] tracking-wide text-cream-muted/80">
            {shortAddress(pool.address)}
            {tab === "contributed" && pool.createdByMe && (
              <span className="ml-2 text-gold/80">(also creator)</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status === "live" && (
            <span className={`${STATUS_PILL_LIVE} inline-flex items-center gap-1.5`}>
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-60" />
                <span className="relative size-1.5 rounded-full bg-gold" />
              </span>
              LIVE
            </span>
          )}
          {status === "reached" && (
            <span className={STATUS_PILL_REACHED}>GOAL REACHED</span>
          )}
          {status === "missed" && (
            <span className={STATUS_PILL_MISSED}>
              {pool.closedEarly ? "CLOSED EARLY" : "GOAL NOT MET"}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pool.address);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label={`Remove ${pool.name} from history`}
            title="Remove from history"
            className="inline-flex size-6 items-center justify-center rounded-full border border-[color:var(--border)] bg-black/25 text-cream-muted/70 transition-all duration-150 hover:scale-105 hover:border-[color:var(--destructive)]/60 hover:bg-[color:var(--destructive)]/15 hover:text-[color:var(--destructive)]"
          >
            <X className="size-3" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className={desaturate}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-[family-name:var(--font-mono-jb)] text-[16px] font-bold tracking-tight text-gold sm:text-[18px]">
            {formatCurrency(pool.raised)}
            <span className="ml-1 text-[12px] font-normal text-cream-muted sm:text-[13px]">
              / {formatCurrency(pool.goal)}
            </span>
          </p>
          <span className="font-[family-name:var(--font-mono-jb)] text-[11px] text-cream-muted/85">
            {progressPct}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/35">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              status === "reached"
                ? "bg-[#7fd99f]"
                : status === "missed"
                  ? "bg-[color:var(--destructive)]/70"
                  : "bg-gold"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className={`mt-auto flex items-center justify-between gap-3 font-[family-name:var(--font-mono-jb)] text-[11px] text-cream-muted ${desaturate}`}>
        <span>
          {pool.contributors} of {pool.contributorsCap} paid
        </span>
        <span className={status === "live" ? "text-cream-muted/85" : ""}>
          {formatTimeLeft(pool.deadline, nowSec, status)}
        </span>
      </div>
    </motion.div>
  );
}

function EmptyState({ tab, filter }: { tab: Tab; filter: StatusFilter }) {
  let heading = "No pools here yet";
  let message: React.ReactNode = "Try a different filter.";

  if (tab === "mine") {
    if (filter === "all") {
      message = (
        <>
          <Link href="/create" className="text-gold underline-offset-4 hover:underline">
            Create your first pool
          </Link>{" "}
          to get started.
        </>
      );
    } else if (filter === "live") {
      heading = "No live pools";
      message = (
        <>
          <Link href="/create" className="text-gold underline-offset-4 hover:underline">
            Create a new pool
          </Link>{" "}
          to start collecting.
        </>
      );
    } else {
      heading = "No past pools";
      message = "Pools you finish or expire will show up here.";
    }
  } else {
    if (filter === "all") {
      heading = "No contributions yet";
      message = "You haven't contributed to any pools yet.";
    } else if (filter === "live") {
      heading = "No live contributions";
      message = "Pools you contribute to will appear here while they're still active.";
    } else {
      heading = "No past contributions";
      message = "Concluded pools you contributed to will appear here.";
    }
  }

  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[color:var(--border)] bg-black/15 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/[0.04] text-cream-muted">
        <Inbox className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="text-[16px] font-bold text-cream">{heading}</h3>
      <p className="max-w-sm text-[13px] leading-relaxed text-cream-muted">
        {message}
      </p>
    </div>
  );
}

const TAB_BTN_BASE =
  "inline-flex min-h-[40px] items-center justify-center rounded-full px-4 py-2 text-[13px] font-semibold tracking-[0.02em] transition-all duration-200 sm:px-5";
const TAB_BTN_ACTIVE = "bg-gold text-[#1a0e0e] shadow-[0_10px_28px_-12px_rgba(232,181,71,0.7)]";
const TAB_BTN_INACTIVE =
  "border border-[color:var(--border)] bg-transparent text-cream hover:border-cream-muted/40 hover:bg-white/[0.04]";

const CHIP_BASE =
  "inline-flex min-h-[36px] items-center justify-center rounded-full px-3.5 py-1.5 font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.14em] transition-all duration-200";
const CHIP_ACTIVE = "ring-2 ring-gold/70 bg-gold/12 text-gold";
const CHIP_INACTIVE =
  "border border-[color:var(--border)] text-cream-muted hover:border-cream-muted/45 hover:text-cream";

export default function HistoryPage() {
  const PROGRAM_ID = useMemo(
    () => new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!),
    [],
  );
  const { connection } = useConnection();

  const [tab, setTab] = useState<Tab>("mine");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [pools, setPools] = useState<PoolView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const nowSec = useMemo(() => Math.floor(Date.now() / 1000), []);

  const readProgram = useMemo(() => {
    const provider = new AnchorProvider(connection, {} as never, {
      commitment: "confirmed",
    });
    return new Program(idl as never, provider);
  }, [connection]);

  useEffect(() => {
    let cancelled = false;
    void PROGRAM_ID;

    async function load() {
      setLoading(true);
      const created = new Set(getCreatedPools());
      const contributed = new Set(getContributedPools());
      const all = Array.from(new Set([...created, ...contributed]));

      const fetched = await Promise.all(
        all.map(async (addr): Promise<PoolView | null> => {
          const snap = getPoolSnapshot(addr);
          try {
            const pk = new PublicKey(addr);
            const account = (await (readProgram.account as never as {
              pool: { fetch(pk: PublicKey): Promise<PoolAccount> };
            }).pool.fetch(pk));
            const goalUsd = account.goal.toNumber() / 1_000_000;
            const onchainRaisedUsd = account.currentAmount.toNumber() / 1_000_000;
            const perPersonLamports = account.amountPerPerson.toNumber();
            const onchainContributorCount =
              perPersonLamports > 0
                ? Math.round(account.currentAmount.toNumber() / perPersonLamports)
                : 0;
            const deadline = account.deadline.toNumber();
            const nowSec = Math.floor(Date.now() / 1000);
            const goalReached = onchainRaisedUsd >= goalUsd;
            const expired = nowSec >= deadline;
            const isMissed = expired && !goalReached;
            // For missed pools, prefer the snapshot's high-water mark so the
            // card shows who paid + how short of goal even after refunds drain
            // the on-chain currentAmount and close contribution PDAs.
            const raisedUsd = isMissed && snap
              ? Math.max(onchainRaisedUsd, snap.raised)
              : onchainRaisedUsd;
            const contributorCount = isMissed && snap
              ? Math.max(onchainContributorCount, snap.contributors.length)
              : onchainContributorCount;
            return {
              address: addr,
              name: account.reason || snap?.reason || "Untitled pool",
              raised: raisedUsd,
              goal: goalUsd,
              contributors: contributorCount,
              contributorsCap: account.numContributors,
              deadline,
              createdByMe: created.has(addr),
              contributedByMe: contributed.has(addr),
              closedEarly: account.closedEarly,
            };
          } catch {
            // Pool account is gone (creator closed it, etc). If we have a
            // snapshot we can still render a "GOAL NOT MET" card from history.
            if (!snap) return null;
            return {
              address: addr,
              name: snap.reason || "Untitled pool",
              raised: snap.raised,
              goal: snap.goal,
              contributors: snap.contributors.length,
              contributorsCap: snap.numContributors,
              deadline: snap.deadline,
              createdByMe: created.has(addr),
              contributedByMe: contributed.has(addr),
              closedEarly: false,
            };
          }
        }),
      );

      if (cancelled) return;
      setPools(fetched.filter((p): p is PoolView => p !== null));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [readProgram, PROGRAM_ID, refreshKey]);

  const visiblePools = useMemo(() => {
    const scoped = pools.filter((p) =>
      tab === "mine" ? p.createdByMe : p.contributedByMe,
    );
    if (filter === "all") return scoped;
    return scoped.filter((p) => {
      const status = classifyPool(p, nowSec);
      return filter === "live" ? status === "live" : status !== "live";
    });
  }, [pools, tab, filter, nowSec]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar sticky={false} />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-8 text-center md:mb-10">
            <p className="mb-3 font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.22em] text-gold sm:mb-4">
              Protocol V1.0
            </p>
            <h1 className="mb-3 text-[clamp(28px,6vw,48px)] font-bold leading-[1.05] tracking-[-0.012em] text-cream sm:mb-4">
              Pool{" "}
              <em className="font-[family-name:var(--font-serif)] font-bold italic text-gold">
                History
              </em>
            </h1>
            <p className="mx-auto max-w-xl text-[14px] leading-[1.65] text-cream-muted sm:text-[15px]">
              Every pool you&apos;ve started or contributed to, in one place. Open
              one to view its current state, contribute, withdraw, or refund.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Pool history tabs"
            className="mb-5 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              role="tab"
              aria-selected={tab === "mine"}
              onClick={() => setTab("mine")}
              className={`${TAB_BTN_BASE} ${tab === "mine" ? TAB_BTN_ACTIVE : TAB_BTN_INACTIVE}`}
            >
              My Pools
            </button>
            <button
              role="tab"
              aria-selected={tab === "contributed"}
              onClick={() => setTab("contributed")}
              className={`${TAB_BTN_BASE} ${tab === "contributed" ? TAB_BTN_ACTIVE : TAB_BTN_INACTIVE}`}
            >
              Contributed To
            </button>
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {(["all", "live", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`${CHIP_BASE} ${filter === f ? CHIP_ACTIVE : CHIP_INACTIVE}`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label="Refresh"
              title="Refresh"
              className={`${CHIP_BASE} ${CHIP_INACTIVE} inline-flex items-center gap-1.5`}
            >
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} strokeWidth={2.25} />
              Refresh
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${tab}-${filter}-${loading ? "loading" : "loaded"}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {loading ? (
                <div className="col-span-full flex items-center justify-center gap-2 rounded-3xl border border-dashed border-[color:var(--border)] bg-black/15 px-6 py-16 font-[family-name:var(--font-mono-jb)] text-[12px] text-cream-muted">
                  <RefreshCw className="size-3.5 animate-spin" strokeWidth={2} />
                  Loading pools…
                </div>
              ) : visiblePools.length === 0 ? (
                <EmptyState tab={tab} filter={filter} />
              ) : (
                visiblePools.map((pool) => (
                  <PoolCard
                    key={pool.address}
                    pool={pool}
                    nowSec={nowSec}
                    tab={tab}
                    onDelete={(address) => {
                      forgetPool(address);
                      setPools((prev) => prev.filter((p) => p.address !== address));
                    }}
                  />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
