"use client";

import { motion } from "framer-motion";
import { Eye, ShieldCheck, RotateCcw, BadgeDollarSign } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
};

const FEATURES: Feature[] = [
  {
    title: "Transparent",
    body: "Every contribution and withdrawal is visible on-chain. Anyone can verify the pool state at any time.",
    icon: Eye,
  },
  {
    title: "Non-custodial",
    body: "No company holds your money. Funds live in a smart contract that only executes the rules you agreed to.",
    icon: ShieldCheck,
  },
  {
    title: "Automatic refunds",
    body: "If the goal isn't met by the deadline, contributors claim their refund directly — no approval needed.",
    icon: RotateCcw,
  },
  {
    title: "No fees",
    body: "FlashPool takes nothing. You only pay Solana's network fee — fractions of a cent per transaction.",
    icon: BadgeDollarSign,
  },
];

export default function WhyOnChain() {
  return (
    <section id="why-on-chain" className="relative px-6 py-20 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Header block — centered to match HowItWorks */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-20 max-w-2xl text-center lg:mb-24"
        >
          <p className="mb-5 font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.22em] text-gold">
            Why on-chain
          </p>
          <h2 className="mb-6 text-[clamp(40px,5vw,64px)] font-bold leading-[1.04] tracking-[-0.012em] text-cream">
            Why On-Chain
          </h2>
          <p className="font-[family-name:var(--font-playfair)] text-[clamp(22px,2.2vw,30px)] italic text-cream-muted">
            Trust the contract, not the company.
          </p>
        </motion.div>

        {/* Feature grid — 2 × 2 on desktop */}
        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:gap-9">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col rounded-3xl border border-white/[0.07] bg-white/[0.025] p-9 transition-all duration-300 hover:border-gold/40 hover:bg-white/[0.05] hover:shadow-[0_28px_60px_-30px_rgba(232,168,56,0.35)] lg:p-11"
              >
                <span className="mb-7 inline-flex size-14 items-center justify-center rounded-2xl bg-gold/10 ring-1 ring-gold/30 transition-all duration-300 group-hover:scale-105 group-hover:bg-gold/20 group-hover:ring-gold/55">
                  <Icon className="size-7 text-gold" strokeWidth={1.6} />
                </span>
                <h3 className="mb-4 text-[26px] font-bold leading-tight tracking-tight text-cream">
                  {f.title}
                </h3>
                <p className="text-[16px] leading-[1.65] text-cream-muted">
                  {f.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
