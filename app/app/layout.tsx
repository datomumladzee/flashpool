import type { Metadata } from "next";
import { Space_Grotesk, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SolanaWalletProvider from "@/components/WalletProvider";

// Space Grotesk — primary UI sans (navbar, buttons, body, forms).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Fraunces — modern serif for hero / headline italic accents. Has true bold
// italic at 700 so the big "Pool" / "History" / "Fast, cheap, Secure." accents
// can render with real weight (no synthetic bold).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-jb",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlashPool — Pool money on Solana",
  description: "Settle group payments on Solana. No middleman, no chasing, no awkwardness.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <head>
        {/* Runs before <body> paints. If the visitor has already seen the
            intro this session, sets `data-intro-skip` on <html> so the
            server-rendered intro overlay is hidden via CSS without a frame
            of flash. First-visit flow: this no-ops, the SSR intro paints
            navy from the very first frame (no red flash before React
            hydrates), and the React-side animation plays on top. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (sessionStorage.getItem('flashpool_intro_seen') === '1') {
                  document.documentElement.dataset.introSkip = '1';
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body>
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  );
}
