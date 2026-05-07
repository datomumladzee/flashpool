"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function FinalCTA() {
  return (
    <section className="relative px-6 py-20 sm:px-8 md:py-24 lg:px-12">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="mb-5 font-[family-name:var(--font-mono-jb)] text-[11px] uppercase tracking-[0.22em] text-gold">
            Ready when you are
          </p>
          <h2 className="mb-6 text-[clamp(40px,5vw,64px)] font-bold leading-[1.04] tracking-[-0.012em] text-cream">
            Ready to start a pool?
          </h2>
          <p className="mx-auto mb-14 max-w-xl font-[family-name:var(--font-playfair)] text-[clamp(22px,2.2vw,30px)] italic text-cream-muted">
            Connect your wallet and deploy in under a minute.
          </p>

          <div className="relative inline-block">
            {/* Stage-light glow behind the CTA */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-40 -inset-y-20 -z-10 blur-3xl"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(232,168,56,0.55) 0%, rgba(232,168,56,0.18) 35%, rgba(232,168,56,0) 70%)",
              }}
            />

            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gold px-12 py-6 text-[20px] font-bold text-[#1a0e0e] shadow-[0_24px_60px_-20px_rgba(232,168,56,0.85)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_32px_80px_-18px_rgba(232,168,56,1)]"
            >
              <span aria-hidden className="text-[22px] leading-none">
                ⚡
              </span>
              Create a Pool
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
