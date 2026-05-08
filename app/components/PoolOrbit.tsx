"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PoolOrbitProps {
  nodeCount?: number;
  goalLabel?: string;
  // Index of the "you" node (creator's own slot) when the creator opts to
  // contribute. Pass null/undefined to render every node as an external
  // contributor with the default styling.
  youIndex?: number | null;
  // Optional label for the "you" node — wallet address truncated, e.g. "YOU"
  // or "9xQ…wTk". Defaults to "YOU" when youIndex is set but no label provided.
  youLabel?: string;
}

const SIZE = 480;
const CENTER = SIZE / 2;
const ORBIT_R = 175;
const POOL_R = 64;
const ARC_R = POOL_R + 14;

// Cycle target: ~6s total at the default count
//   initial pause + (NUM × COIN_STEP) + CELEBRATE = ~6000ms
const INITIAL_DELAY = 250;
const COIN_STEP = 800;        // ms between coins (also coin flight duration)
const CELEBRATE_HOLD = 1750;

const NAMES = [
  "DM", "ZL", "OG", "RS", "JT",
"AM", "KB", "TS", "WP", "VR", "SH", "NK",
"PX", "LV", "QN", "CY", "FD", "HJ", "BM", "UR", "XE", "TI",
"GA", "PL", "RW", "DK", "MF", "YC", "NZ", "QA", "VB", "LU",
"XE", "TR", "JM", "KO", "FI", "GH", "CP", "SD", "YL", "WX",
"BV", "EP", "XA", "UC", "RO", "IN", "KL", "MT", "PQ", "ZH",
"AF", "GD", "JE", "SN", "TV", "XO", "LM", "QR", "UY", "CB",
"HF", "IK", "NO", "PS", "RT", "VW", "YZ", "AC", "DE", "FG",
"HJ", "KL", "MN", "OP", "QR", "ST", "UV", "WX", "YZ", "BA",
"CD", "EF", "GH", "IJ", "JK", "LM", "NP", "RS", "TU", "VW",
"XY", "ZA", "BC", "DF", "EG", "HI", "JL", "KM", "NP", "QT"
];
const labelFor = (i: number) => NAMES[i] ?? `U${i + 1}`;

// Renders the live "X/Y" center text. If goalLabel contains a "/" with a
// numeric left side (e.g. "5/5", "$1,200/$1,200"), the left side is scaled
// proportionally to filled/total so the label tracks the animation. Otherwise
// it falls back to "{filled}/{rightSide}" or just goalLabel.
function formatProgressLabel(
  filled: number,
  total: number,
  goalLabel: string,
): string {
  const slashIdx = goalLabel.indexOf("/");
  if (slashIdx === -1) return goalLabel;
  const leftStr = goalLabel.slice(0, slashIdx);
  const rightStr = goalLabel.slice(slashIdx + 1);
  const match = leftStr.match(/^(\D*?)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return `${filled}/${rightStr}`;
  const [, prefix, numStr, suffix] = match;
  const totalNum = Number(numStr.replace(/,/g, ""));
  if (!Number.isFinite(totalNum)) return `${filled}/${rightStr}`;
  const currentNum = total > 0 ? Math.round((filled / total) * totalNum) : 0;
  return `${prefix}${currentNum.toLocaleString()}${suffix}/${rightStr}`;
}

export default function PoolOrbit({
  nodeCount = 5,
  goalLabel = "5/5",
  youIndex = null,
  youLabel = "YOU",
}: PoolOrbitProps = {}) {
  const NUM = Math.max(1, Math.min(100, Math.floor(nodeCount)));
  const youSlot =
    youIndex != null && youIndex >= 0 && youIndex < NUM ? youIndex : null;

  // step: 0 = idle, 1..NUM = coin from contributor i-1 in flight; after NUM = celebrating
  const [step, setStep] = useState(0);
  const [filled, setFilled] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const angleOf = (i: number) => (i / NUM) * Math.PI * 2 - Math.PI / 2;
  const posOf = (i: number) => {
    const a = angleOf(i);
    return [CENTER + ORBIT_R * Math.cos(a), CENTER + ORBIT_R * Math.sin(a)] as const;
  };

  // Reset the animation cleanly whenever the node count changes so we don't
  // leave a stale `filled` pointing at a node that no longer exists.
  useEffect(() => {
    setStep(0);
    setFilled(0);
    setCelebrating(false);
  }, [NUM]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (celebrating) {
      timer = setTimeout(() => {
        setCelebrating(false);
        setFilled(0);
        setStep(1);
      }, CELEBRATE_HOLD);
    } else if (step === 0) {
      timer = setTimeout(() => setStep(1), INITIAL_DELAY);
    } else {
      // coin in flight: when it lands, fill++ and either advance or celebrate
      timer = setTimeout(() => {
        setFilled(step);
        if (step === NUM) setCelebrating(true);
        else setStep(step + 1);
      }, COIN_STEP);
    }

    return () => clearTimeout(timer);
  }, [step, celebrating, NUM]);

  const arcCircumference = 2 * Math.PI * ARC_R;
  const filledFraction = filled / NUM;
  const centerText = formatProgressLabel(filled, NUM, goalLabel);
  const centerFontSize =
    centerText.length <= 5 ? 26 : centerText.length <= 9 ? 18 : 14;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full h-full"
      role="img"
      aria-label="Animated diagram of contributors funding a shared pool"
    >
      <defs>
        <radialGradient id="poolGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8B547" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#E8B547" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="poolFill" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#c44848" />
          <stop offset="100%" stopColor="#5e2424" />
        </radialGradient>
        <radialGradient id="contribFill" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#a33c3c" />
          <stop offset="100%" stopColor="#7a2f2f" />
        </radialGradient>
        <filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Ambient halo */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={POOL_R + 90}
        fill="url(#poolGlow)"
        animate={{
          opacity: celebrating ? 1 : 0.4,
          scale: celebrating ? 1.18 : 1,
        }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ transformOrigin: `${CENTER}px ${CENTER}px`, transformBox: "fill-box" }}
      />

      {/* Orbit ring (dashed, drifting) */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={ORBIT_R}
        fill="none"
        stroke="#E8B547"
        strokeOpacity={0.2}
        strokeWidth={1}
        strokeDasharray="2 5"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: -200 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />

      {/* Spokes from each contributor to center (lit when paid) */}
      {Array.from({ length: NUM }).map((_, i) => {
        const [x, y] = posOf(i);
        const isPaid = i < filled;
        return (
          <line
            key={`spoke-${i}`}
            x1={x}
            y1={y}
            x2={CENTER}
            y2={CENTER}
            stroke="#E8B547"
            strokeOpacity={isPaid ? 0.18 : 0.05}
            strokeWidth={1}
            style={{ transition: "stroke-opacity 0.6s ease" }}
          />
        );
      })}

      {/* Contributor nodes */}
      {Array.from({ length: NUM }).map((_, i) => {
        const [x, y] = posOf(i);
        const isPaid = i < filled;
        const isYou = youSlot === i;
        // Slightly larger node + heavier gold ring to pick out the creator's
        // own slot. Label is the youLabel ("YOU" or wallet snippet) instead of
        // a generic initial pair.
        const nodeR = isYou ? 32 : 28;
        const ringStrokeWidth = isYou ? 2.2 : isPaid ? 1.6 : 1;
        const ringOpacity = isYou ? 1 : isPaid ? 0.9 : 0.35;
        const youLabelTrimmed = youLabel.length > 5 ? youLabel.slice(0, 5) : youLabel;
        const nodeLabel = isYou ? youLabelTrimmed : labelFor(i);
        return (
          <g key={`c-${i}`}>
            {/* persistent gold halo behind the "you" node so it reads as the
                creator even before the orbit animation reaches that slot */}
            {isYou && (
              <circle
                cx={x}
                cy={y}
                r={42}
                fill="#E8B547"
                fillOpacity={0.1}
              />
            )}
            {/* glow when paid */}
            {isPaid && (
              <motion.circle
                cx={x}
                cy={y}
                r={36}
                fill="#E8B547"
                fillOpacity={0.12}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: "fill-box" }}
              />
            )}
            <motion.circle
              cx={x}
              cy={y}
              r={nodeR}
              fill="url(#contribFill)"
              stroke="#E8B547"
              strokeOpacity={ringOpacity}
              strokeWidth={ringStrokeWidth}
              animate={
                isPaid
                  ? { opacity: 1 }
                  : { opacity: [0.75, 1, 0.75] }
              }
              transition={
                isPaid
                  ? { duration: 0.3 }
                  : { duration: 2.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }
              }
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize={isYou ? 10 : 11}
              fontWeight={isYou ? 700 : 600}
              fill={isYou || isPaid ? "#E8B547" : "#f5e6e6"}
              fillOpacity={isYou ? 1 : isPaid ? 1 : 0.55}
              style={{
                fontFamily: "var(--font-mono-jb), monospace",
                letterSpacing: "0.08em",
              }}
            >
              {nodeLabel}
            </text>
          </g>
        );
      })}

      {/* Coin in flight */}
      <AnimatePresence>
        {!celebrating && step >= 1 && step <= NUM && (() => {
          const [sx, sy] = posOf(step - 1);
          return (
            <motion.g key={`coin-${step}-${filled}`}>
              <motion.circle
                r={9}
                fill="#E8B547"
                filter="url(#softBlur)"
                initial={{ cx: sx, cy: sy, opacity: 0 }}
                animate={{
                  cx: CENTER,
                  cy: CENTER,
                  opacity: [0, 0.9, 0.9, 0],
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.45, 0, 0.55, 1],
                  times: [0, 0.15, 0.85, 1],
                }}
              />
              <motion.circle
                r={4.5}
                fill="#fff5d6"
                initial={{ cx: sx, cy: sy, opacity: 0 }}
                animate={{
                  cx: CENTER,
                  cy: CENTER,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.45, 0, 0.55, 1],
                  times: [0, 0.15, 0.85, 1],
                }}
              />
            </motion.g>
          );
        })()}
      </AnimatePresence>

      {/* Pool ring (progress arc) */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={ARC_R}
        fill="none"
        stroke="#E8B547"
        strokeOpacity={0.12}
        strokeWidth={3}
      />
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={ARC_R}
        fill="none"
        stroke="#E8B547"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={arcCircumference}
        initial={false}
        animate={{
          strokeDashoffset: arcCircumference * (1 - filledFraction),
        }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />

      {/* Center pool */}
      <motion.circle
        cx={CENTER}
        cy={CENTER}
        r={POOL_R}
        fill="url(#poolFill)"
        stroke="#E8B547"
        strokeOpacity={celebrating ? 0.95 : 0.45}
        strokeWidth={1.5}
        animate={{ scale: celebrating ? [1, 1.08, 1] : 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{ transformOrigin: `${CENTER}px ${CENTER}px`, transformBox: "fill-box" }}
      />

      {/* Pool label */}
      <text
        x={CENTER}
        y={CENTER - 10}
        textAnchor="middle"
        fontSize={9}
        fontWeight={500}
        fill="#f5e6e6"
        fillOpacity={0.45}
        style={{
          fontFamily: "var(--font-mono-jb), monospace",
          letterSpacing: "0.18em",
        }}
      >
        POOL
      </text>
      <motion.text
        x={CENTER}
        y={CENTER + 14}
        textAnchor="middle"
        fontSize={centerFontSize}
        fontWeight={700}
        fill="#E8B547"
        animate={{ scale: celebrating ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          fontFamily: "var(--font-mono-jb), monospace",
          transformOrigin: `${CENTER}px ${CENTER + 14}px`,
          transformBox: "fill-box",
        }}
      >
        {centerText}
      </motion.text>

      {/* Goal-met label, fades in during celebration */}
      <motion.text
        x={CENTER}
        y={CENTER + 38}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        fill="#E8B547"
        animate={{ opacity: celebrating ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        style={{
          fontFamily: "var(--font-mono-jb), monospace",
          letterSpacing: "0.2em",
        }}
      >
        GOAL MET
      </motion.text>
    </svg>
  );
}
