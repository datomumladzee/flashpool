"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

interface IntroProps {
  onComplete: () => void;
}

// Total intro budget — overlay starts exiting at HOLD_MS, exit anim adds ~0.5s.
const HOLD_MS = 1250;

export default function Intro({ onComplete }: IntroProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          key="intro"
          // Exit: fade + slight scale-up so the page behind feels like it's
          // pulled forward, not hard-cut.
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse at center, #2a4480 0%, #1f325e 45%, #0d1530 100%)",
          }}
          aria-hidden
        >
          {/* Subtle screen shake at the moment of strike */}
          <motion.div
            className="relative flex items-center justify-center"
            animate={{ x: [0, -3, 4, -2, 0], y: [0, 2, -3, 1, 0] }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeInOut" }}
          >
            {/* Gold glow halo behind the bolt — sits at the same point and
                pulses in slightly bigger than the logo */}
            <motion.div
              className="absolute h-[440px] w-[440px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(232,168,56,0.65) 0%, rgba(232,168,56,0.15) 45%, rgba(232,168,56,0) 70%)",
                filter: "blur(20px)",
              }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.2, 1], opacity: [0, 0.95, 0.75] }}
              transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Bolt logo — mix-blend-mode: screen knocks out the PNG's black
                background against the navy bg without needing an alpha asset */}
            <motion.div
              className="relative z-10"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{
                scale: [0.3, 1.18, 1],
                opacity: [0, 1, 1],
              }}
              transition={{
                duration: 0.75,
                ease: [0.34, 1.45, 0.5, 1],
                times: [0, 0.7, 1],
              }}
            >
              <Image
                src="/intro-bolt.png"
                alt=""
                width={260}
                height={260}
                priority
                className="h-[200px] w-auto sm:h-[240px] md:h-[260px]"
                style={{ mixBlendMode: "screen" }}
              />
            </motion.div>
          </motion.div>

          {/* Lightning streaks — diagonal beams crossing the screen, staggered */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`streak-${i}`}
              className="pointer-events-none absolute h-[2px] w-[160%]"
              style={{
                top: `${12 + i * 18}%`,
                left: "-30%",
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,225,150,0.95) 45%, rgba(232,168,56,1) 55%, transparent 100%)",
                filter: "drop-shadow(0 0 8px rgba(232,168,56,0.95))",
                transform: `rotate(${i % 2 === 0 ? -7 : 7}deg)`,
              }}
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: "60%", opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 0.55,
                delay: 0.32 + i * 0.05,
                ease: [0.4, 0, 0.2, 1],
                times: [0, 0.15, 0.6, 1],
              }}
            />
          ))}

          {/* Brief white flash at the moment of strike — like real lightning */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.55, 0] }}
            transition={{
              duration: 0.18,
              delay: 0.55,
              ease: "easeOut",
              times: [0, 0.25, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
