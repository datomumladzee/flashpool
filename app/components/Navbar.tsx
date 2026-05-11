"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

// Mono on the link strip gives a slightly technical feel that contrasts the
// bold sans wordmark — ties to the protocol-V1.0 eyebrow language already used
// on /create, /pool, and /history.
const LINK_FONT = "font-[family-name:var(--font-mono-jb)]";

function NavLink({
  href,
  children,
  active,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${LINK_FONT} group relative text-[11.5px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 ${
        active ? "text-gold" : "text-cream/85 hover:text-cream"
      }`}
    >
      {children}
      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-1 left-0 block h-px bg-gold transition-all duration-200 ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </Link>
  );
}

function HowItWorksLink() {
  const pathname = usePathname();
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      document
        .getElementById("how-it-works")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // else: let Next.js navigate to /#how-it-works; html has scroll-behavior:
    // smooth so the browser scrolls to the anchor on arrival.
  };
  return (
    <NavLink href="/#how-it-works" active={false} onClick={onClick}>
      How it works
    </NavLink>
  );
}

function RoadmapLink() {
  const pathname = usePathname();
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      document
        .getElementById("roadmap")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  return (
    <NavLink href="/#roadmap" active={false} onClick={onClick}>
      Roadmap
    </NavLink>
  );
}

function FooterLink() {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document
      .getElementById("site-footer")
      ?.scrollIntoView({ behavior: "smooth", block: "end" });
  };
  return (
    <NavLink href="#site-footer" active={false} onClick={onClick}>
      Links
    </NavLink>
  );
}

// Idle calm + hover storm:
//   Idle — two soft gold pulse rings emanate from behind the bolt every 3s,
//          offset so one is always mid-flight. The bolt itself oscillates its
//          gold drop-shadow between 40% and 80% over 2s. Quiet but alive.
//   Hover — the bolt scales to 1.10 with a constant micro-jitter (±2°), the
//           glow goes hot white-gold, the existing rings tighten to 1.2s, two
//           extra hot rings join in at 0.7s, and 8 sparks fire outward from
//           center in every direction on a staggered 0.7s loop.
//
// PNG ships with a black background, composited with `mix-blend-mode: screen`
// so the black pixels drop out on the red navbar.
const STORM_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]; // 8-way fan
const STORM_DISTANCE = 22; // px from center

function CenterLogo() {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href="/"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 sm:gap-2.5"
      aria-label="FlashPool home"
    >
      <span className="relative flex size-8 items-center justify-center sm:size-9">
        {/* Idle pulse ring 1 — speeds up under hover. */}
        <motion.span
          aria-hidden
          className="absolute inset-1 rounded-full bg-gold/30"
          animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
          transition={{
            duration: hovered ? 1.2 : 3,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
        {/* Idle pulse ring 2 (offset). */}
        <motion.span
          aria-hidden
          className="absolute inset-1 rounded-full bg-gold/30"
          animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
          transition={{
            duration: hovered ? 1.2 : 3,
            repeat: Infinity,
            ease: "easeOut",
            delay: hovered ? 0.6 : 1.5,
          }}
        />

        {/* Hover-only hot rings — brighter, wider, faster. */}
        <AnimatePresence>
          {hovered && (
            <>
              <motion.span
                key="hot-ring-1"
                aria-hidden
                className="absolute inset-0 rounded-full bg-gold/55"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 2.1], opacity: [0.7, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                key="hot-ring-2"
                aria-hidden
                className="absolute inset-0 rounded-full bg-gold/55"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1, 2.1], opacity: [0.7, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: 0.35,
                }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Bolt — calm flicker idle, hot jitter on hover. */}
        <motion.span
          className="relative block size-9"
          animate={
            hovered
              ? {
                  scale: 1.1,
                  rotate: [-2, 2, -1.5, 1.5, -2],
                  filter: [
                    "drop-shadow(0 0 14px rgba(255,240,200,0.85))",
                    "drop-shadow(0 0 22px rgba(255,240,200,1))",
                    "drop-shadow(0 0 14px rgba(255,240,200,0.85))",
                  ],
                }
              : {
                  scale: 1,
                  rotate: 0,
                  filter: [
                    "drop-shadow(0 0 4px rgba(232,181,71,0.4))",
                    "drop-shadow(0 0 10px rgba(232,181,71,0.8))",
                    "drop-shadow(0 0 4px rgba(232,181,71,0.4))",
                  ],
                }
          }
          transition={
            hovered
              ? {
                  scale: { duration: 0.2, ease: "easeOut" },
                  rotate: { duration: 0.18, repeat: Infinity, ease: "easeInOut" },
                  filter: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
                }
              : {
                  scale: { duration: 0.3, ease: "easeOut" },
                  rotate: { duration: 0.3, ease: "easeOut" },
                  filter: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                }
          }
        >
          <Image
            src="/logo-bolt.png"
            alt=""
            aria-hidden
            width={64}
            height={64}
            priority
            className="size-8 object-contain sm:size-9"
            style={{ mixBlendMode: "screen" }}
          />
        </motion.span>

        {/* Storm sparks — fire outward in 8 directions, staggered, while hovering. */}
        <AnimatePresence>
          {hovered &&
            STORM_ANGLES.map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const dx = Math.cos(rad) * STORM_DISTANCE;
              const dy = Math.sin(rad) * STORM_DISTANCE;
              return (
                <motion.span
                  key={`spark-${i}`}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 m-auto size-1 rounded-full bg-gold shadow-[0_0_8px_rgba(232,181,71,0.95)]"
                  initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
                  animate={{
                    x: [0, dx],
                    y: [0, dy],
                    opacity: [1, 0],
                    scale: [1, 0.3],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: i * 0.08,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              );
            })}
        </AnimatePresence>
      </span>
      <span className="font-[family-name:var(--font-sans)] text-[15px] font-semibold tracking-[0.02em] text-cream sm:text-[18px]">
        FlashPool
      </span>
    </Link>
  );
}

export default function Navbar({ sticky = true }: { sticky?: boolean } = {}) {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open and close on route change.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navStyles: React.CSSProperties = {
    backgroundColor: "rgba(155, 56, 60, 0.65)",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    paddingTop: "calc(env(safe-area-inset-top) + 14px)",
  };

  return (
    <>
      <nav
        style={navStyles}
        className={`${sticky ? "sticky top-0 z-40" : "relative"} flex items-center gap-2 px-3 pb-3 sm:px-6 sm:pb-3.5 lg:px-12 border-b transition-colors duration-200 ${
          scrolled ? "border-white/10" : "border-transparent"
        }`}
      >
        {/* Mobile-only hamburger — flush left, ≥44px touch target. */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="lg:hidden inline-flex size-11 items-center justify-center rounded-full text-cream/85 transition-colors hover:bg-white/[0.08]"
        >
          <Menu className="size-5" strokeWidth={2} />
        </button>

        {/* Desktop link group — hidden below lg. */}
        <div className="hidden flex-1 items-center gap-9 pl-8 lg:flex xl:gap-11 xl:pl-16">
          <NavLink href="/create" active={pathname === "/create"}>
            Create
          </NavLink>
          <NavLink href="/history" active={pathname === "/history"}>
            Your Pools
          </NavLink>
        </div>

        {/* Center logo — absolutely centered relative to the page width so
            the surrounding nav groups can grow/shrink without nudging it. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <CenterLogo />
        </div>

        {/* Right-side spacer fills the row on mobile. */}
        <div className="flex-1 lg:hidden" />

        <div className="ml-auto flex flex-1 items-center justify-end gap-6 lg:gap-10 xl:gap-12">
          <div className="hidden items-center gap-9 pr-2 lg:flex xl:gap-11 xl:pr-4">
            <HowItWorksLink />
            <RoadmapLink />
            <FooterLink />
          </div>
          <div className="fp-wallet-trigger">
            {/* Children override the adapter's state label entirely, so only
                pass them when disconnected — once connected we let the adapter
                render the truncated address itself. */}
            <WalletMultiButton>
              {connected ? undefined : (
                <>
                  <span className="sm:hidden">Connect</span>
                  <span className="hidden sm:inline">Connect Wallet</span>
                </>
              )}
            </WalletMultiButton>
          </div>
        </div>
      </nav>

      {/* Mobile menu — slide-in panel from the left + dim backdrop. Hidden on
          lg+. Reuses the same NavLink components so styling stays consistent. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-y-0 left-0 flex w-[min(82vw,300px)] flex-col bg-[color:var(--red-card)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]"
              style={{
                paddingTop: "calc(env(safe-area-inset-top) + 18px)",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 18px)",
                paddingLeft: "calc(env(safe-area-inset-left) + 20px)",
                paddingRight: "20px",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-sans)] text-[15px] font-semibold tracking-[0.02em] text-cream">
                  FlashPool
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex size-11 items-center justify-center rounded-full text-cream/85 transition-colors hover:bg-white/[0.08]"
                >
                  <X className="size-5" strokeWidth={2} />
                </button>
              </div>

              <ul className="mt-8 flex flex-col gap-1">
                {[
                  { href: "/create", label: "Create" },
                  { href: "/history", label: "Past Pools" },
                ].map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={`${LINK_FONT} flex min-h-[44px] items-center rounded-lg px-3 text-[14px] font-medium uppercase tracking-[0.14em] transition-colors ${
                          active
                            ? "bg-gold/10 text-gold"
                            : "text-cream/85 hover:bg-white/[0.05] hover:text-cream"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href="/#how-it-works"
                    onClick={(e) => {
                      setMenuOpen(false);
                      if (pathname === "/") {
                        e.preventDefault();
                        // wait for menu to close before scrolling so layout is stable
                        setTimeout(() => {
                          document
                            .getElementById("how-it-works")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 220);
                      }
                    }}
                    className={`${LINK_FONT} flex min-h-[44px] items-center rounded-lg px-3 text-[14px] font-medium uppercase tracking-[0.14em] text-cream/85 transition-colors hover:bg-white/[0.05] hover:text-cream`}
                  >
                    How it works
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#roadmap"
                    onClick={(e) => {
                      setMenuOpen(false);
                      if (pathname === "/") {
                        e.preventDefault();
                        setTimeout(() => {
                          document
                            .getElementById("roadmap")
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 220);
                      }
                    }}
                    className={`${LINK_FONT} flex min-h-[44px] items-center rounded-lg px-3 text-[14px] font-medium uppercase tracking-[0.14em] text-cream/85 transition-colors hover:bg-white/[0.05] hover:text-cream`}
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <a
                    href="#site-footer"
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(false);
                      setTimeout(() => {
                        document
                          .getElementById("site-footer")
                          ?.scrollIntoView({ behavior: "smooth", block: "end" });
                      }, 220);
                    }}
                    className={`${LINK_FONT} flex min-h-[44px] items-center rounded-lg px-3 text-[14px] font-medium uppercase tracking-[0.14em] text-cream/85 transition-colors hover:bg-white/[0.05] hover:text-cream`}
                  >
                    Links
                  </a>
                </li>
              </ul>

              <div className="mt-auto pt-6 fp-wallet-trigger">
                <WalletMultiButton />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
