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
      <div className="grid grid-cols-1 items-center gap-10 px-4 pt-8 pb-14 sm:px-6 md:px-8 lg:grid-cols-2 lg:gap-8 lg:px-12 lg:pt-12 lg:pb-16">
        {/* LEFT — text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full min-w-0 lg:max-w-[640px] lg:pl-[60px]"
        >
          {/* Headline block — eyebrow + bolt + text, all sharing the same width */}
          <div className="mb-6">
            {/* Eyebrow — centered above the headline block */}
            <p className="mb-5 text-center font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.22em] text-gold lg:pr-[130px]">
              Powered by Solana
            </p>
            <div className="flex min-w-0 items-stretch justify-center gap-3 sm:gap-4 lg:justify-start lg:gap-5">
              {/* Bolt sits beside the headline from md+ — on phones we drop
                  it so the headline gets the whole row width. The Navbar's
                  animated bolt + the section's own gold accents keep the
                  brand mark present without crowding 360px viewports. */}
              <div className="hidden self-stretch md:block md:w-[80px] md:shrink-0 lg:w-[92px]">
                <BoltMark />
              </div>
              <div className="flex min-w-0 flex-col text-center md:text-left">
                <h1 className="text-[clamp(32px,5.8vw,76px)] font-bold leading-[1.02] tracking-[-0.012em] text-cream">
                  Pool Money
                </h1>
                <p className="font-[family-name:var(--font-serif)] text-[clamp(26px,5.2vw,64px)] font-bold italic leading-[1.05] text-gold">
                  Fast, cheap, Secure.
                </p>
              </div>
            </div>
          </div>

          {/* CTA — single, centered, slightly larger than the old 50/50 pair */}
          <div className="mb-5 flex justify-center lg:max-w-[440px]">
            <Link
              href="/create"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gold px-8 py-4 text-[17px] font-bold text-[#1a0e0e] shadow-[0_22px_48px_-16px_rgba(232,181,71,0.75)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_30px_70px_-14px_rgba(232,181,71,1)] sm:w-auto sm:px-12 sm:py-5 sm:text-[19px]"
            >
              Create A Pool
            </Link>
          </div>

          {/* Trust line — aligned with CTA row above */}
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 font-[family-name:var(--font-mono-jb)] text-[10px] tracking-wide text-cream-muted/85 sm:text-[11px] lg:max-w-[560px] lg:pr-[120px]">
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
          className="relative mx-auto aspect-square w-full max-w-[320px] sm:max-w-[420px] md:max-w-[480px] lg:mx-0 lg:ml-auto lg:max-w-[560px] lg:justify-self-end lg:-translate-x-12"
        >
          <PoolOrbit />
        </motion.div>
      </div>
    </section>
  );
}
