"use client";

import { motion } from "framer-motion";
import { Rocket, Share2, HandCoins } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step = {
  num: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Create",
    body: "Set your goal, deadline, number of contributors, and amount per person. Deploy the pool in one transaction.",
    icon: Rocket,
  },
  {
    num: "02",
    title: "Share",
    body: "Copy the pool link and send it to your group. Anyone with the link can connect their wallet and contribute.",
    icon: Share2,
  },
  {
    num: "03",
    title: "Settle",
    body: "Goal met? Creator withdraws. Deadline passed unfunded? Every contributor gets a refund.",
    icon: HandCoins,
  },
];

// Each card carries progressively more gold weight from left to right —
// the row reads as a sequence (warming up to the payoff), not a stamped grid.
const VARIANTS = [
  {
    // 01 — calm, low-key
    card: "bg-white/[0.025] border border-white/[0.07]",
    glow: "",
    number: "text-cream/85",
    iconWrap: "bg-gold/8 ring-1 ring-gold/25",
  },
  {
    // 02 — mid, gold ring
    card: "bg-white/[0.04] border border-gold/25",
    glow: "shadow-[0_24px_60px_-30px_rgba(232,168,56,0.25)]",
    number: "text-gold/90",
    iconWrap: "bg-gold/15 ring-1 ring-gold/45",
  },
  {
    // 03 — payoff, full gold accent + warm glow
    card: "bg-[linear-gradient(180deg,rgba(232,168,56,0.10)_0%,rgba(232,168,56,0.02)_100%)] border border-gold/55",
    glow: "shadow-[0_36px_72px_-24px_rgba(232,168,56,0.45)]",
    number: "text-gold",
    iconWrap: "bg-gold/25 ring-1 ring-gold/70",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative px-4 py-14 sm:px-6 sm:py-20 md:px-8 md:py-24 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header block */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-14 max-w-2xl text-center md:mb-20 lg:mb-24"
        >

          <h2 className="mb-4 text-[clamp(34px,6vw,64px)] font-bold leading-[1.04] tracking-[-0.012em] text-cream sm:mb-6">
            How It Works
          </h2>
          <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3.4vw,30px)] italic text-cream-muted">
            Three steps to settle.
          </p>
        </motion.div>

        {/* Step cards */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-3 lg:gap-8">
          {STEPS.map((step, i) => {
            const v = VARIANTS[i];
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                  delay: i * 0.12,
                }}
                whileHover={{ y: -6 }}
                className={`group relative flex min-h-[260px] flex-col rounded-3xl p-6 transition-shadow duration-300 sm:min-h-[320px] sm:p-8 lg:p-9 ${v.card} ${v.glow}`}
              >
                {/* Number — Fraunces italic, dominant but no longer dwarfing
                    the rest of the card now that the body is more compact. */}
                <span
                  className={`mb-5 font-[family-name:var(--font-serif)] text-[44px] font-bold italic leading-none tracking-tight sm:mb-8 sm:text-[54px] lg:text-[60px] ${v.number}`}
                >
                  {step.num}
                </span>

                {/* Icon */}
                <span
                  className={`mb-5 inline-flex size-10 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-105 sm:mb-6 sm:size-12 ${v.iconWrap}`}
                >
                  <Icon className="size-5 text-gold sm:size-6" strokeWidth={1.6} />
                </span>

                {/* Title */}
                <h3 className="mb-3 text-[19px] font-bold leading-tight tracking-tight text-cream sm:mb-4 sm:text-[24px]">
                  {step.title}
                </h3>

                {/* Body */}
                <p className="text-[14px] leading-[1.6] text-cream-muted sm:text-[15px]">
                  {step.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
