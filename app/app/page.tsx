"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Navbar />

      {/* ── HERO ── */}
      <section style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "100px 24px 80px",
        minHeight: "calc(100vh - 70px)",
      }}>
        <p style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
          color: "var(--gold)",
          letterSpacing: "0.2em",
          marginBottom: "24px",
        }}>
          PROTOCOL V1.0 · POWERED BY SOLANA
        </p>

        <h1 style={{
          fontSize: "clamp(48px, 8vw, 88px)",
          fontWeight: 700,
          color: "var(--text)",
          lineHeight: 1.1,
          marginBottom: "24px",
          fontFamily: "Inter, sans-serif",
          maxWidth: "800px",
        }}>
          Group funding,{" "}
          <em style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "var(--gold)" }}>
            trustless
          </em>
        </h1>

        <p style={{
          fontSize: "18px",
          color: "var(--text-muted)",
          maxWidth: "480px",
          lineHeight: 1.7,
          marginBottom: "40px",
        }}>
          Create a pool, share the link, collect funds. If the goal isn't met — everyone gets refunded automatically. No middleman, no trust required.
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/create" style={{
            padding: "16px 36px",
            background: "var(--gold)",
            color: "#000",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: 700,
            textDecoration: "none",
            fontFamily: "Inter, sans-serif",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            ⚡ Create a Pool
          </Link>
          <a href="#how-it-works" style={{
            padding: "16px 36px",
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: 600,
            textDecoration: "none",
            fontFamily: "Inter, sans-serif",
          }}>
            How it works
          </a>
        </div>

        {/* trust line */}
        <p style={{
          marginTop: "48px",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "11px",
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
        }}>
          ✓ Verified Smart Contract &nbsp;•&nbsp; No Middleman &nbsp;•&nbsp; Open Source
        </p>
      </section>

      {/* ── WHAT IT DOES ── */}
      <section style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "80px 24px",
        textAlign: "center",
      }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "16px" }}>
          WHAT IT DOES
        </p>
        <p style={{ fontSize: "18px", color: "var(--text-muted)", lineHeight: 1.8 }}>
          FlashPool lets any group collect money toward a shared goal — a trip, a gift, a shared bill — with a smart contract enforcing the rules. Contributors pay a fixed amount. If everyone pays before the deadline, the creator gets the funds. If not, every contributor gets an automatic refund. No trust, no middleman, no drama.
        </p>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" style={{ padding: "80px 24px", background: "rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "16px", textAlign: "center" }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: "56px", fontFamily: "Inter, sans-serif" }}>
            Three steps to{" "}
            <em style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "var(--gold)" }}>settle</em>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
            {[
              {
                step: "01",
                title: "Create",
                desc: "Set your goal, deadline, number of contributors, and amount per person. Deploy the pool in one transaction.",
                icon: "⚡",
              },
              {
                step: "02",
                title: "Share",
                desc: "Copy the pool link and send it to your group. Anyone with the link can connect their wallet and contribute.",
                icon: "🔗",
              },
              {
                step: "03",
                title: "Settle",
                desc: "Goal met? Creator withdraws. Deadline passed unfunded? Every contributor gets an automatic refund.",
                icon: "✓",
              },
            ].map((s) => (
              <div key={s.step} style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                padding: "32px 24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "32px", marginBottom: "16px" }}>{s.icon}</div>
                <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "var(--gold)", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  STEP {s.step}
                </p>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)", marginBottom: "12px", fontFamily: "Inter, sans-serif" }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY ON-CHAIN ── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--gold)", letterSpacing: "0.15em", marginBottom: "16px", textAlign: "center" }}>
            WHY ON-CHAIN
          </p>
          <h2 style={{ fontSize: "32px", fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: "48px", fontFamily: "Inter, sans-serif" }}>
            No trust{" "}
            <em style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "var(--gold)" }}>required</em>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {[
              { title: "Transparent", desc: "Every contribution and withdrawal is visible on-chain. Anyone can verify the pool state at any time." },
              { title: "Non-custodial", desc: "No company holds your money. Funds live in a smart contract that only executes the rules you agreed to." },
              { title: "Automatic refunds", desc: "If the goal isn't met by the deadline, contributors can claim their refund directly — no approval needed." },
              { title: "No fees", desc: "FlashPool takes nothing. You only pay Solana's network fee — fractions of a cent per transaction." },
            ].map((item) => (
              <div key={item.title} style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "28px 24px",
              }}>
                <h3 style={{ fontSize: "17px", fontWeight: 700, color: "var(--gold)", marginBottom: "10px", fontFamily: "Inter, sans-serif" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{
        padding: "80px 24px",
        textAlign: "center",
        background: "rgba(0,0,0,0.1)",
      }}>
        <h2 style={{ fontSize: "36px", fontWeight: 700, color: "var(--text)", marginBottom: "16px", fontFamily: "Inter, sans-serif" }}>
          Ready to start a{" "}
          <em style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "var(--gold)" }}>pool?</em>
        </h2>
        <p style={{ fontSize: "16px", color: "var(--text-muted)", marginBottom: "32px" }}>
          Connect your wallet and deploy in under a minute.
        </p>
        <Link href="/create" style={{
          padding: "16px 40px",
          background: "var(--gold)",
          color: "#000",
          borderRadius: "12px",
          fontSize: "16px",
          fontWeight: 700,
          textDecoration: "none",
          fontFamily: "Inter, sans-serif",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
        }}>
          ⚡ Create a Pool
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "32px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
      }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--text-muted)" }}>
          ⚡ FlashPool · Solana Devnet
        </p>
        <div style={{ display: "flex", gap: "24px" }}>
          {[
            { label: "GitHub",     href: "https://github.com/datomumladzee/flashpool" },
            { label: "Twitter",    href: "https://twitter.com" },
            { label: "Solscan",    href: `https://solscan.io/account/4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3?cluster=devnet` },
          ].map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "12px",
              color: "var(--text-muted)",
              textDecoration: "none",
            }}>
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
