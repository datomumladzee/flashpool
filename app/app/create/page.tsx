"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DateTimePicker from "@/components/DateTimePicker";
import PoolOrbit from "@/components/PoolOrbit";
import ErrorBanner from "@/components/ErrorBanner";
import { translateError, type TranslatedError } from "@/lib/errors";
import { recordCreatedPool } from "@/lib/history";
import { formatRelativeTime } from "@/lib/time";
import idl from "@/lib/idl.json";

type FieldName = "reason" | "numContributors" | "amountPerPerson" | "deadline";
const FIELD_ORDER: FieldName[] = [
  "reason",
  "numContributors",
  "amountPerPerson",
  "deadline",
];

function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[color:var(--destructive)]"
    >
      <AlertCircle className="size-[13px] shrink-0" strokeWidth={2} />
      {message}
    </p>
  );
}

type TxStatus = "idle" | "signing" | "pending" | "success" | "error";

export default function CreatePage() {
  const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
  const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);

  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const [reason, setReason] = useState("");
  const [numContributors, setNumContributors] = useState(5);
  const [amountPerPerson, setAmountPerPerson] = useState(400);
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [actionError, setActionError] = useState<TranslatedError | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  // Refs so we can focus / scroll to the first invalid field on submit
  const reasonRef = useRef<HTMLInputElement>(null);
  const numContributorsRef = useRef<HTMLInputElement>(null);
  const amountPerPersonRef = useRef<HTMLInputElement>(null);
  const deadlineRef = useRef<HTMLDivElement>(null);

  function validateField(field: FieldName): string | null {
    switch (field) {
      case "reason":
        if (!reason.trim()) return "Give your pool a name.";
        return null;
      case "numContributors":
        if (!Number.isFinite(numContributors) || numContributors < 1)
          return "Pick at least 1 contributor.";
        if (numContributors > 255) return "Cap is 255 contributors.";
        return null;
      case "amountPerPerson":
        if (!Number.isFinite(amountPerPerson) || amountPerPerson < 1)
          return "Enter an amount in USDC.";
        return null;
      case "deadline":
        if (!deadline) return "Pick a deadline.";
        if (new Date(deadline).getTime() <= Date.now())
          return "Deadline must be in the future.";
        return null;
    }
  }

  function clearError(field: FieldName) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateOnBlur(field: FieldName) {
    const msg = validateField(field);
    setErrors((prev) => {
      if (msg) return { ...prev, [field]: msg };
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function focusFirstInvalid(errs: Partial<Record<FieldName, string>>) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (!first) return;
    const map: Record<FieldName, HTMLElement | null> = {
      reason: reasonRef.current,
      numContributors: numContributorsRef.current,
      amountPerPerson: amountPerPersonRef.current,
      deadline: deadlineRef.current,
    };
    const node = map[first];
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    if (node instanceof HTMLInputElement) node.focus({ preventScroll: true });
  }

  const goal = numContributors * amountPerPerson;

  // Friendly "expires in X" preview under the deadline picker. Falls through
  // to minutes / "<1m" when the deadline is close, instead of rounding to "0h".
  const expiresIn = useMemo(() => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const passed = date.getTime() <= Date.now();
    return { text: formatRelativeTime(date), warn: passed };
  }, [deadline]);

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    return new Program(idl as any, provider);
  }, [connection, wallet]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!program || !wallet.publicKey) return;

    // Run full validation; if any field is invalid, surface inline errors
    // and focus the first invalid one instead of letting the contract call run.
    const nextErrors: Partial<Record<FieldName, string>> = {};
    for (const f of FIELD_ORDER) {
      const msg = validateField(f);
      if (msg) nextErrors[f] = msg;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      focusFirstInvalid(nextErrors);
      return;
    }
    setErrors({});

    setStatus("signing");
    setActionError(null);

    try {
      const [userProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_profile"), wallet.publicKey.toBuffer()],
        PROGRAM_ID,
      );

      let poolCount = 0;
      try {
        const profile = await (program.account as any).userProfile.fetch(
          userProfilePda,
        );
        poolCount = profile.poolCount.toNumber();
      } catch {
        poolCount = 0;
      }

      const poolCountBytes = new BN(poolCount).toArrayLike(Buffer, "le", 8);
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), wallet.publicKey.toBuffer(), poolCountBytes],
        PROGRAM_ID,
      );

      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      const amountLamports = new BN(amountPerPerson * 1_000_000); // USDC has 6 decimals

      setStatus("pending");

      await program.methods
        .createPool(
          reason,
          numContributors,
          amountLamports,
          new BN(deadlineTimestamp),
          USDC_MINT,
        )
        .accounts({
          creator: wallet.publicKey,
          userProfile: userProfilePda,
          pool: poolPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus("success");
      recordCreatedPool(poolPda.toBase58());
      router.push(`/pool/${poolPda.toBase58()}`);
    } catch (err: unknown) {
      const translated = translateError(err);
      setStatus(translated.level === "info" ? "idle" : "error");
      setActionError(translated);
    }
  }

  const busy = status === "signing" || status === "pending";

  // Tailwind class fragments — used multiple times below
  const labelCls =
    "mb-2 flex items-center gap-2 font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.14em] text-cream-muted";
  const inputBaseCls =
    "w-full min-h-[44px] rounded-xl border bg-white/[0.04] px-4 py-3 text-[16px] text-cream outline-none transition-all duration-200 placeholder:text-cream-muted/50 focus:bg-white/[0.06] focus:ring-2 sm:text-[15px]";
  const inputOkCls =
    "border-[color:var(--border)] focus:border-gold/55 focus:ring-gold/20";
  const inputErrCls =
    "border-[color:var(--destructive)]/70 focus:border-[color:var(--destructive)] focus:ring-[color:var(--destructive)]/20";
  const inputCls = (err?: string) =>
    `${inputBaseCls} ${err ? inputErrCls : inputOkCls}`;
  const wrapperBaseCls =
    "flex items-stretch overflow-hidden rounded-xl border bg-white/[0.04] transition-all duration-200 focus-within:bg-white/[0.06] focus-within:ring-2";
  const wrapperOkCls =
    "border-[color:var(--border)] focus-within:border-gold/55 focus-within:ring-gold/20";
  const wrapperErrCls =
    "border-[color:var(--destructive)]/70 focus-within:border-[color:var(--destructive)] focus-within:ring-[color:var(--destructive)]/20";
  const wrapperCls = (err?: string) =>
    `${wrapperBaseCls} ${err ? wrapperErrCls : wrapperOkCls}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar sticky={false} />

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 md:px-8 md:py-16 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--red-card)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] lg:grid-cols-2"
        >
          {/* ── LEFT COLUMN ── narrative + live preview */}
          <div className="flex flex-col justify-between gap-6 p-4 sm:gap-12 sm:p-10 lg:p-12">
            <div>
              <p className="mb-3 text-center font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.22em] text-gold sm:mb-6">
                Protocol V1.0
              </p>
              <h1 className="mb-3 text-center text-[clamp(26px,6vw,44px)] font-bold leading-[1.05] tracking-[-0.012em] text-cream sm:mb-5">
                Create a{" "}
                <em className="font-[family-name:var(--font-serif)] font-bold italic text-gold">
                  Pool
                </em>
              </h1>
              <p className="text-center text-[14px] leading-[1.6] text-cream-muted sm:text-[15px] sm:leading-[1.65]">
                Deploy a transparent, autonomous smart contract to collect
                funds. If the goal isn&apos;t met by the deadline, every
                contributor refunds themselves with a single transaction.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.25 }}
              className="mx-auto aspect-square w-full max-w-[220px] sm:max-w-[280px] lg:max-w-[360px]"
            >
              <PoolOrbit
                nodeCount={Math.max(1, numContributors || 1)}
                goalLabel={`$${goal.toLocaleString()}/$${goal.toLocaleString()}`}
              />
            </motion.div>

            <div>
              {/* Live preview pills */}
              <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: "Goal", value: `$${goal.toLocaleString()}` },
                  { label: "People", value: String(numContributors) },
                  { label: "Each", value: `$${amountPerPerson}` },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className="rounded-xl border border-[color:var(--border)] bg-black/25 px-2 py-2.5 text-center sm:px-3 sm:py-3"
                  >
                    <div className="mb-1 font-[family-name:var(--font-mono-jb)] text-[9px] uppercase tracking-[0.16em] text-cream-muted/80">
                      {pill.label}
                    </div>
                    <div className="font-[family-name:var(--font-mono-jb)] text-[13px] font-bold text-gold sm:text-[15px]">
                      {pill.value}
                    </div>
                  </div>
                ))}
              </div>

              <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-[family-name:var(--font-mono-jb)] text-[12px] tracking-wide text-cream-muted/85 sm:text-[14px]">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-60" />
                  <span className="relative size-1.5 rounded-full bg-gold" />
                </span>
                <span>Verified Smart Contract</span>
                <span className="text-cream-muted/40">·</span>
                <span>No Middleman</span>
              </p>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── form */}
          <div className="border-t border-[color:var(--border)] bg-black/15 p-4 sm:p-10 lg:border-t-0 lg:border-l lg:p-12">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="flex flex-col gap-5"
            >
              {/* 01 — Pool Purpose */}
              <div>
                <label htmlFor="fp-reason" className={labelCls}>
                  <span className="text-gold">01</span> Pool purpose
                </label>
                <input
                  id="fp-reason"
                  ref={reasonRef}
                  type="text"
                  placeholder="What are you collecting for?"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    clearError("reason");
                  }}
                  onBlur={() => validateOnBlur("reason")}
                  maxLength={60}
                  aria-invalid={!!errors.reason}
                  aria-describedby={errors.reason ? "fp-reason-error" : undefined}
                  className={inputCls(errors.reason)}
                />
                <FieldError id="fp-reason-error" message={errors.reason} />
              </div>

              {/* 02 — Contributors stepper */}
              <div>
                <label htmlFor="fp-contributors" className={labelCls}>
                  <span className="text-gold">02</span> Contributors
                </label>
                <div className={`${wrapperCls(errors.numContributors)} min-h-[44px]`}>
                  <button
                    type="button"
                    onClick={() => {
                      setNumContributors(Math.max(1, numContributors - 1));
                      clearError("numContributors");
                    }}
                    aria-label="Decrease contributors"
                    className="inline-flex min-w-[44px] items-center justify-center px-4 text-[22px] leading-none text-gold transition-colors hover:bg-gold/10"
                  >
                    −
                  </button>
                  <input
                    id="fp-contributors"
                    ref={numContributorsRef}
                    type="number"
                    min={1}
                    max={255}
                    value={numContributors}
                    onChange={(e) => {
                      setNumContributors(Number(e.target.value));
                      clearError("numContributors");
                    }}
                    onBlur={() => validateOnBlur("numContributors")}
                    aria-invalid={!!errors.numContributors}
                    aria-describedby={
                      errors.numContributors ? "fp-contributors-error" : undefined
                    }
                    className="flex-1 bg-transparent py-3 text-center text-[16px] text-cream outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-[15px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNumContributors(Math.min(255, numContributors + 1));
                      clearError("numContributors");
                    }}
                    aria-label="Increase contributors"
                    className="inline-flex min-w-[44px] items-center justify-center px-4 text-[22px] leading-none text-gold transition-colors hover:bg-gold/10"
                  >
                    +
                  </button>
                </div>
                <FieldError
                  id="fp-contributors-error"
                  message={errors.numContributors}
                />
              </div>

              {/* 03 — Per Person */}
              <div>
                <label htmlFor="fp-amount" className={labelCls}>
                  <span className="text-gold">03</span> Per person (USDC)
                </label>
                <div className={`${wrapperCls(errors.amountPerPerson)} min-h-[44px]`}>
                  <span className="self-center pl-4 font-[family-name:var(--font-mono-jb)] text-[14px] text-cream-muted">
                    $
                  </span>
                  <input
                    id="fp-amount"
                    ref={amountPerPersonRef}
                    type="number"
                    inputMode="decimal"
                    min={1}
                    value={amountPerPerson}
                    onChange={(e) => {
                      setAmountPerPerson(Number(e.target.value));
                      clearError("amountPerPerson");
                    }}
                    onBlur={() => validateOnBlur("amountPerPerson")}
                    aria-invalid={!!errors.amountPerPerson}
                    aria-describedby={
                      errors.amountPerPerson ? "fp-amount-error" : undefined
                    }
                    className="flex-1 bg-transparent px-3 py-3 text-[16px] text-cream outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none sm:text-[15px]"
                  />
                  <span className="self-center pr-4 font-[family-name:var(--font-mono-jb)] text-[11px] text-cream-muted">
                    USDC
                  </span>
                </div>
                <FieldError
                  id="fp-amount-error"
                  message={errors.amountPerPerson}
                />
              </div>

              {/* 04 — Total Goal (computed) */}
              <div>
                <label className={labelCls}>
                  <span className="text-gold">04</span> Total pool goal
                </label>
                <div className="rounded-xl border border-gold/40 bg-gold/[0.08] px-4 py-3 font-[family-name:var(--font-mono-jb)] text-[16px] font-bold text-gold">
                  ${goal.toLocaleString()} USDC
                </div>
              </div>

              {/* 05 — Expiration */}
              <div ref={deadlineRef}>
                <label className={labelCls}>
                  <span className="text-gold">05</span> Expiration date
                </label>
                <DateTimePicker
                  value={deadline}
                  onChange={(next) => {
                    setDeadline(next);
                    clearError("deadline");
                  }}
                  error={!!errors.deadline}
                />
                <FieldError message={errors.deadline} />
                {expiresIn && !errors.deadline && (
                  <p
                    className={`mt-2 font-[family-name:var(--font-mono-jb)] text-[11px] tracking-wide ${
                      expiresIn.warn ? "text-[#ff6b6b]" : "text-cream-muted/85"
                    }`}
                  >
                    {expiresIn.warn
                      ? `⚠ ${expiresIn.text}`
                      : `→ Expires ${expiresIn.text}`}
                  </p>
                )}
              </div>

              {/* Info note */}
              <p className="rounded-lg border-l-2 border-gold bg-black/20 px-4 py-3 text-[12px] leading-[1.6] text-cream-muted">
                Funds are locked in escrow until the goal is met or the
                deadline passes.
              </p>

              {/* Action error */}
              {actionError && (
                <ErrorBanner
                  variant={actionError.level}
                  title={actionError.title}
                  message={actionError.message}
                  action={actionError.action}
                  raw={actionError.raw}
                  onDismiss={() => setActionError(null)}
                />
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!wallet.publicKey || busy}
                className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-4 text-[16px] font-bold text-[#1a0e0e] shadow-[0_18px_40px_-16px_rgba(232,181,71,0.7)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_26px_60px_-14px_rgba(232,181,71,0.95)] disabled:cursor-not-allowed disabled:bg-gold/40 disabled:shadow-none disabled:hover:scale-100"
              >
                <span aria-hidden className="text-[18px] leading-none">
                  ⚡
                </span>
                {status === "signing"
                  ? "Waiting for signature..."
                  : status === "pending"
                  ? "Sending transaction..."
                  : !wallet.publicKey
                  ? "Connect wallet first"
                  : "Create a Pool"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
