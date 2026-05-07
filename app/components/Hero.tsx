"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PoolOrbit from "./PoolOrbit";

function BoltMark() {
  // Tall outlined bolt with neon-gold glow — matches the reference PNG.
  // Default preserveAspectRatio (xMidYMid meet) keeps the bolt's natural shape.
  return (
    <svg
      viewBox="0 0 40 100"
      className="h-full w-full"
      style={{
        filter:
          "drop-shadow(0 0 6px rgba(232,181,71,0.55)) drop-shadow(0 0 18px rgba(232,181,71,0.35))",
      }}
      aria-hidden
    >
      <path
        d="M24 4 L4 54 L18 54 L14 96 L36 42 L22 42 Z"
        fill="none"
        stroke="#F5CC5E"
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Hero() {
  return (
    <section className="relative">
      <div className="grid grid-cols-1 items-center gap-10 px-8 pt-8 pb-14 lg:grid-cols-2 lg:gap-8 lg:px-12 lg:pt-12 lg:pb-16">
        {/* LEFT — text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="lg:max-w-[640px] lg:pl-[60px]"
        >
          {/* Headline block — eyebrow + bolt + text, all sharing the same width */}
          <div className="mb-6">
            {/* Eyebrow — flush-right above the headline block */}
            <p className="mb-5 pr-[130px] text-center font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.22em] text-gold">
              Powered by Solana
            </p>
            <div className="flex items-stretch gap-4 lg:gap-5">
              <div className="block w-[64px] shrink-0 self-stretch sm:w-[80px] lg:w-[92px]">
                <BoltMark />
              </div>
              <div className="flex flex-col">
                <h1 className="text-[clamp(40px,5vw,68px)] font-bold leading-[1.02] tracking-[-0.012em] text-cream">
                  Pool Money
                </h1>
                <p className="font-[family-name:var(--font-playfair)] text-[clamp(34px,4.4vw,56px)] font-bold italic leading-[1.05] text-gold">
                  Fast,cheap, Secure.
                </p>
              </div>
            </div>
          </div>

          {/* CTAs — side-by-side, 50/50, shifted right under headline block */}
          <div className="mb-5 flex max-w-[440px] gap-4">
            <Link
              href="/create"
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-gold px-7 py-4 text-[17px] font-bold text-[#1a0e0e] shadow-[0_18px_40px_-16px_rgba(232,181,71,0.7)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_26px_60px_-14px_rgba(232,181,71,0.95)]"
            >
              Create A Pool
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-gold/70 bg-transparent px-7 py-4 text-[17px] font-bold text-gold transition-all duration-300 hover:scale-[1.02] hover:border-gold hover:bg-gold/[0.06]"
            >
              How it works
            </a>
          </div>

          {/* Trust line — aligned with CTA row above */}
          <p className="flex max-w-[560px] flex-wrap items-center justify-center gap-x-2 gap-y-1.5 pr-[120px] font-[family-name:var(--font-mono-jb)] text-[11px] tracking-wide text-cream-muted/85">
            <span className="relative mr-1 flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-60" />
              <span className="relative size-1.5 rounded-full bg-gold" />
            </span>
            <span>Verified Smart Contract</span>
            <span className="text-cream-muted/40">·</span>
            <span>Non-custodial</span>
            <span className="text-cream-muted/40">·</span>
            <span>Open source</span>
          </p>
        </motion.div>

        {/* RIGHT — orbit (unchanged) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative mx-auto aspect-square w-full max-w-[560px] lg:mx-0 lg:ml-auto lg:justify-self-end lg:-translate-x-12"
        >
          <PoolOrbit />
        </motion.div>
      </div>
    </section>
  );
}
