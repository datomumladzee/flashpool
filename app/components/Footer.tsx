"use client";

import type { ComponentType, SVGProps } from "react";

const PROGRAM_ID = "4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3";

// Inline brand glyphs — lucide-react v1+ dropped GitHub / Twitter / LinkedIn
// for trademark reasons, so we use minimal SimpleIcons-style paths instead.
function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55 4.57-1.53 7.86-5.84 7.86-10.93C23.5 5.66 18.35.5 12 .5z" />
    </svg>
  );
}

function TwitterIcon(props: SVGProps<SVGSVGElement>) {
  // X-style monogram glyph
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  );
}

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function SolscanIcon(props: SVGProps<SVGSVGElement>) {
  // Two-path Solscan glyph (outer C-shape + inner ring), recolored to
  // currentColor so it picks up the same cream-muted → gold hover treatment
  // as the other footer icons.
  return (
    <svg viewBox="0 0 316 315" fill="currentColor" aria-hidden {...props}>
      <path d="M157.501 -0.375009C158.243 -0.3738 158.986 -0.372592 159.751 -0.371347C200.901 -0.19058 238.327 15.5969 268.001 44C268.795 44.7309 269.589 45.4618 270.407 46.2148C299.639 74.0132 314.085 114.372 316.001 154C316.043 154.866 316.086 155.732 316.129 156.625C317.036 195.299 303.157 231.777 277.001 260C272.034 255.884 267.588 251.579 263.251 246.812C258.943 242.131 254.59 237.533 250.063 233.062C245.827 228.877 241.829 224.56 238.001 220C239.494 215.902 241.505 212.358 243.751 208.625C258.049 184.089 261.052 157.294 253.876 130C247.036 105.774 231.076 84.526 209.251 71.875C185.025 58.3674 158.112 53.5756 131.001 61C105.763 68.7927 83.7433 84.5134 70.9019 108.01C58.1815 132.403 54.1314 159.243 62.1256 185.875C70.2872 211.566 87.1832 233.11 111.001 246C136.273 258.52 161.194 259.401 188.125 252.452C190.247 251.941 192.193 251.796 194.376 251.75C195.47 251.711 195.47 251.711 196.587 251.672C203.77 252.648 208.21 257.811 213.024 262.73C213.77 263.481 214.516 264.231 215.285 265.004C217.656 267.392 220.016 269.789 222.376 272.188C223.986 273.813 225.596 275.437 227.208 277.061C231.147 281.033 235.077 285.013 239.001 289C237.172 293.096 234.662 294.969 230.938 297.312C230.016 297.897 230.016 297.897 229.075 298.493C208.561 311.04 185.304 315.442 161.563 315.375C160.771 315.374 159.978 315.373 159.162 315.371C119.658 315.208 81.7949 301.088 52.0006 275C51.1511 274.283 50.3016 273.567 49.4264 272.828C43.1832 267.436 38.0125 261.54 33.0006 255C32.3212 254.125 31.6419 253.249 30.942 252.348C14.9048 231.058 4.95175 206.294 1.00058 180C0.816245 178.802 0.631909 177.605 0.441987 176.371C-4.60214 134.33 7.93634 92.1714 33.7896 58.9648C59.598 26.653 96.2021 6.05584 137.122 0.414542C143.913 -0.311258 150.679 -0.395715 157.501 -0.375009Z" />
      <path d="M197.996 108.172C209.455 118.008 217.931 131.94 220 147C221.423 167.213 218.076 184.808 204.625 200.5C192.888 212.619 177.288 219.847 160.402 220.354C142.737 220.513 127.002 215.572 114.062 203.26C101.611 190.821 95.117 175.085 94.625 157.5C95.1486 140.845 100.967 125.086 112.727 113.105C137.096 90.5362 171.111 88.6825 197.996 108.172Z" />
    </svg>
  );
}

type SocialLink = {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const LINKS: SocialLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/datomumladzee/flashpool",
    Icon: GithubIcon,
  },
  { label: "Twitter", href: "https://x.com/flashpoolsol", Icon: TwitterIcon },
  {
    label: "Solscan",
    href: `https://solscan.io/account/${PROGRAM_ID}?cluster=devnet`,
    Icon: SolscanIcon,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/flashpool/",
    Icon: LinkedinIcon,
  },
];

export default function Footer() {
  return (
    <footer
      id="site-footer"
      className="border-t border-[color:var(--border)] px-4 py-6 sm:px-8 sm:py-8 lg:px-12"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 sm:flex-row">
        <p className="text-center font-[family-name:var(--font-mono-jb)] text-[13px] font-semibold tracking-wide text-cream-muted sm:text-[14px]">
          <span aria-hidden className="mr-1.5 text-gold">
            ⚡
          </span>
          FlashPool
          <span className="mx-2 text-cream-muted/50">·</span>
          Solana Devnet
        </p>

        <ul className="flex items-center gap-3 sm:gap-5">
          {LINKS.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="inline-flex size-12 items-center justify-center rounded-full border-2 border-cream-muted/30 text-cream-muted/80 transition-all duration-200 hover:border-gold/70 hover:bg-white/[0.06] hover:text-gold sm:size-15"
              >
                <Icon className="size-[20px] sm:size-[24px]" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
