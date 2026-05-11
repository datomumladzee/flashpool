"use client";

import { motion } from "framer-motion";

// Compact S-curve sits inside a wider, shorter viewBox so the path reads
// as a slim band rather than the dominant element of the section.
const VB = { w: 1000, h: 220 };

// Continuous cubic wave hitting all four milestone points.
// Each segment uses explicit, symmetric control points (≈140 in from each
// endpoint with the matching endpoint's Y) so the curvature is balanced
// across the full path — the shorthand `S` form was producing lopsided
// reflections on segments 2 and 3.
// Y range 60↔160 keeps the curve gentle inside the 220-unit-tall canvas.
const PATH_D =
  "M 80 160 " +
  "C 220 160, 240 60, 380 60 " +
  "C 520 60, 540 160, 620 160 " +
  "C 760 160, 780 60, 920 60";

type Milestone = {
  tag: string;
  svgX: number;
  svgY: number;
  /** Active = current stage (glow + infinite pulse). Future stages are flat dots. */
  active?: boolean;
  /** Reveal delay (s) — chosen so each dot lights up roughly as the line passes it. */
  delay: number;
};

const MILESTONES: Milestone[] = [
  { tag: "NOW",    svgX:  80, svgY: 160, active: true, delay: 0.25 },
  { tag: "NEXT",   svgX: 380, svgY:  60,               delay: 0.70 },
  { tag: "EXPAND", svgX: 620, svgY: 160,               delay: 1.15 },
  { tag: "VISION", svgX: 920, svgY:  60,               delay: 1.60 },
];

type Card = {
  tag: string;
  title: string;
  bullets: string[];
  highlighted?: boolean;
};

const CARDS: Card[] = [
  {
    tag: "NOW",
    title: "MVP on devnet",
    bullets: ["Pool create + contribute", "Smart contract live", "Real-time tracking"],
    highlighted: true,
  },
  {
    tag: "NEXT",
    title: "Mainnet & mobile",
    bullets: ["Mainnet launch", "Embedded wallets"],
  },
  {
    tag: "EXPAND",
    title: "Beyond crypto",
    bullets: ["Buy crypto in-app", "Withdraw to bank", "Non-crypto onboarding"],
  },
  {
    tag: "VISION",
    title: "The Goal",
    bullets: ["Infrastructure for global group payments"],
  },
];

export default function Roadmap() {
  return (
    <section
      id="roadmap"
      className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20 md:px-8 md:py-24 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        {/* Header — centered, big title + small subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
        >
          <h2 className="mb-4 text-[clamp(40px,7vw,80px)] font-bold leading-[1.04] tracking-[-0.012em] text-cream sm:mb-6">
            Roadmap
          </h2>
          <p className="font-[family-name:var(--font-serif)] text-[clamp(18px,3.4vw,30px)] italic text-cream-muted">
            From MVP to infrastructure.
          </p>
        </motion.div>

        {/* Path stage — aspect-locked so the SVG and the HTML label overlay
            share an identical coordinate space at every viewport width.
            ~70% of the page width on large screens. */}
        <div
          className="relative mx-auto mb-12 w-full max-w-[880px] md:mb-16"
          style={{ aspectRatio: `${VB.w} / ${VB.h}` }}
        >
          <svg
            viewBox={`0 0 ${VB.w} ${VB.h}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <defs>
              {/* Gold line with soft fade at both ends so the path feels infinite,
                  not abruptly cut. Locked to user-space coords matching the path. */}
              <linearGradient
                id="roadmap-line-gradient"
                gradientUnits="userSpaceOnUse"
                x1="80"
                y1="0"
                x2="920"
                y2="0"
              >
                <stop offset="0%" stopColor="#E8B547" stopOpacity="0" />
                <stop offset="10%" stopColor="#E8B547" stopOpacity="1" />
                <stop offset="90%" stopColor="#E8B547" stopOpacity="1" />
                <stop offset="100%" stopColor="#E8B547" stopOpacity="0" />
              </linearGradient>
              <filter
                id="roadmap-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* Soft glow underlay — same path, fat & blurred, gives the line warmth. */}
            <motion.path
              d={PATH_D}
              fill="none"
              stroke="#E8B547"
              strokeOpacity="0.18"
              strokeWidth="14"
              strokeLinecap="round"
              filter="url(#roadmap-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                pathLength: { duration: 2, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.5, ease: "easeOut" },
              }}
            />

            {/* Animated main line */}
            <motion.path
              d={PATH_D}
              fill="none"
              stroke="url(#roadmap-line-gradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                pathLength: { duration: 2, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.4, ease: "easeOut" },
              }}
            />

            {/* Milestone dots — active (NOW) gets the full treatment: an
                infinite outer sonar ping, a soft pulsing halo, a brighter
                drop-shadow glow, a larger core, and a jewel highlight.
                Future stages are smaller, slightly muted flat gold circles
                that fade in with no halo, no glow, no pulse. */}
            {MILESTONES.map((m) => (
              <g key={m.tag}>
                {m.active && (
                  <>
                    {/* Sonar ping — expanding ring that fades out, restarts. */}
                    <motion.circle
                      cx={m.svgX}
                      cy={m.svgY}
                      r={13}
                      fill="none"
                      stroke="#E8B547"
                      strokeWidth="2"
                      initial={{ opacity: 0, scale: 1 }}
                      whileInView={{ opacity: [0, 0.65, 0], scale: [1, 2.6, 2.6] }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        delay: m.delay + 0.4,
                        duration: 2.4,
                        times: [0, 0.55, 1],
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                      style={{ transformOrigin: `${m.svgX}px ${m.svgY}px` }}
                    />

                    {/* Soft glow halo — blurred fat circle, pulsing brightness. */}
                    <motion.circle
                      cx={m.svgX}
                      cy={m.svgY}
                      r={22}
                      fill="#E8B547"
                      initial={{ opacity: 0, scale: 0.7 }}
                      whileInView={{
                        opacity: [0, 0.55, 0.3, 0.55, 0.3],
                        scale: [0.7, 1, 1.35, 1, 1.35],
                      }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{
                        delay: m.delay + 0.45,
                        duration: 3.6,
                        times: [0, 0.08, 0.5, 0.55, 1],
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        transformOrigin: `${m.svgX}px ${m.svgY}px`,
                        filter: "blur(8px)",
                      }}
                    />
                  </>
                )}

                <motion.circle
                  cx={m.svgX}
                  cy={m.svgY}
                  r={m.active ? 13 : 9}
                  fill="#E8B547"
                  fillOpacity={m.active ? 1 : 0.78}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.5"
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: m.active ? [0, 1.3, 1] : 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    delay: m.delay,
                    duration: m.active ? 0.7 : 0.5,
                    times: m.active ? [0, 0.55, 1] : undefined,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    transformOrigin: `${m.svgX}px ${m.svgY}px`,
                    filter: m.active
                      ? "drop-shadow(0 0 14px rgba(232,181,71,0.95)) drop-shadow(0 0 4px rgba(255,248,227,0.6))"
                      : undefined,
                  }}
                />

                {m.active && (
                  <motion.circle
                    cx={m.svgX}
                    cy={m.svgY - 4}
                    r={4}
                    fill="#fff8e3"
                    fillOpacity="0.95"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 0.95 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ delay: m.delay + 0.3, duration: 0.4 }}
                  />
                )}
              </g>
            ))}
          </svg>

          {/* HTML label overlay — text stays crisp at any viewport because it
              isn't rendered inside the SVG (where it would scale with the canvas).
              All labels sit centered horizontally just below each dot, clear
              of the dot's halo and the curve itself. */}
          {MILESTONES.map((m) => {
            const leftPct = (m.svgX / VB.w) * 100;
            const topPct = (m.svgY / VB.h) * 100;
            return (
              <div
                key={m.tag}
                className="pointer-events-none absolute z-10"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  // ↓ Change the second value to push labels further below
                  //   each dot. The outer plain div owns this transform so
                  //   framer-motion's animation (below) can't override it.
                  transform: "translate(calc(-50% + 3px), 15px)",
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    delay: m.delay + 0.18,
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                  className="whitespace-nowrap font-[family-name:var(--font-mono-jb)] text-[10px] uppercase tracking-[0.28em] text-cream sm:text-[11px]"
                >
                  {m.tag}
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Detail cards — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.tag}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.08 }}
              className={
                c.highlighted
                  ? "relative flex flex-col rounded-2xl border border-gold/55 bg-gold/[0.06] p-6 shadow-[0_18px_44px_-22px_rgba(232,181,71,0.55)] sm:p-7"
                  : "relative flex flex-col rounded-2xl bg-[var(--red-card)] p-6 sm:p-7"
              }
            >
              <p className="mb-3 font-[family-name:var(--font-mono-jb)] text-[10px] uppercase tracking-[0.28em] text-gold sm:text-[11px]">
                {c.tag}
              </p>
              <h3 className="mb-4 font-[family-name:var(--font-serif)] text-[22px] font-bold leading-[1.15] tracking-tight text-cream sm:text-[24px]">
                {c.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {c.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-cream sm:text-[15px]"
                  >
                    <span
                      aria-hidden
                      className="mt-[7px] inline-block size-1.5 shrink-0 rounded-full bg-gold"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
