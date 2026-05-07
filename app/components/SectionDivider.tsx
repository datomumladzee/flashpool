"use client";

import { motion } from "framer-motion";

// Visual breath between sections. A permanent thin gold seam stays static;
// a glowing gold node continuously travels along the seam from left to
// right, like a charge running through a wire.
export default function SectionDivider() {
  return (
    <div
      aria-hidden
      className="relative flex h-36 items-center justify-center overflow-hidden"
    >
      {/* Wrapper that defines the seam's width — also the track for the node */}
      <div className="relative h-[4px] w-[76%] max-w-5xl">
        {/* Static gold seam */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(232,168,56,0.55) 50%, transparent 100%)",
          }}
        />

        {/* Traveling node — moves along the seam */}
        <motion.span
          className="pointer-events-none absolute top-1/2 -translate-y-1/2"
          initial={{ left: "0%", opacity: 0 }}
          animate={{
            left: ["0%", "100%"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 4,
            ease: "linear",
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            repeatDelay: 0.8,
          }}
        >
          <span className="relative flex size-7 -translate-x-1/2 items-center justify-center">
            <span className="absolute size-12 animate-ping rounded-full bg-gold opacity-45" />
            <span className="relative size-7 rounded-full bg-gold shadow-[0_0_28px_rgba(232,168,56,1)]" />
          </span>
        </motion.span>
      </div>
    </div>
  );
}
