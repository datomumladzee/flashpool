<div align="center">
  <img src="app/public/og-image.png" alt="FlashPool" width="100%" />
</div>

# FlashPool

**Decentralized group pooling on Solana.** Create a pool with a goal, a deadline, and a fixed contribution amount. If the goal is hit, the creator withdraws. If the deadline passes unfunded, every contributor refunds themselves with a single transaction. No company holds the funds at any point — they live in a Solana program that only executes the rules you agreed to.

Program ID (devnet): `4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3`

---

## How it works

1. **Create.** Set a goal (USDC), a deadline, the number of contributors, and the per-person amount. Deploy the pool in one transaction.
2. **Share.** Send the pool link to your group. Anyone with the link connects a wallet and contributes.
3. **Settle.**
   - Goal met before the deadline → creator withdraws the full amount.
   - Deadline passes unfunded → every contributor refunds themselves on demand.
   - Creator wants to cancel early → they request a close, contributors vote; once a majority approves, the pool unwinds and contributors refund.

FlashPool takes no fees. You only pay Solana's network fee — fractions of a cent per instruction.

---

## Repository layout

```
flashpool/
├── programs/flashpool/    # Anchor program (Rust) — on-chain logic
│   └── src/lib.rs
├── tests/                 # ts-mocha integration tests against a local validator
│   └── flashpool.ts
├── app/                   # Next.js 16 frontend (App Router, TypeScript)
│   ├── app/               # routes: /, /create, /pool/[address], /history
│   ├── components/        # Hero, HowItWorks, Roadmap, Navbar, Footer, etc.
│   ├── lib/               # client helpers (Anchor, history, errors, time)
│   └── public/            # static assets (logo, og-image, intro bolt)
├── migrations/            # Anchor deploy scripts
├── Anchor.toml            # Anchor workspace config
└── Cargo.toml             # Rust workspace
```

---

## On-chain program

Six instructions and three account types.

### Instructions

| Instruction      | Who calls it    | What it does                                                                 |
| ---------------- | --------------- | ---------------------------------------------------------------------------- |
| `create_pool`    | Creator         | Initializes a `Pool` PDA + the creator's `UserProfile` if it doesn't exist.  |
| `contribute`     | Any contributor | Transfers the fixed USDC amount into the pool's vault, opens a `Contribution`. |
| `request_cancel` | Creator         | Marks the pool as pending early cancellation. Contributors then vote.        |
| `vote_close`     | Contributor     | Approves the early-close request. A majority unlocks refunds for everyone.   |
| `withdraw`       | Creator         | Drains the vault to the creator once the goal is hit.                        |
| `refund`         | Contributor     | Returns the contributor's USDC after deadline expiry or an approved cancel.  |

### Accounts

- `Pool` — PDA seeded with `["pool", creator, pool_index]`. Holds goal, deadline, contributor count, USDC mint, state flags, vote tallies.
- `Contribution` — per-contributor record proving they paid; closed on refund.
- `UserProfile` — PDA seeded with `["user_profile", creator]`. Tracks the creator's `pool_index` so each `create_pool` derives a unique `Pool` PDA.

---

## Run it locally

### Prerequisites

- Rust + Solana CLI (`solana 1.18+`)
- Anchor `0.32.1`
- Node.js `20+` and pnpm/npm
- A funded devnet wallet (`solana airdrop 2`)

### Build & test the program

```bash
anchor build
anchor test          # spins up a local validator, runs ts-mocha
```

The test suite covers the goal-met happy path (create → contribute → withdraw) and the deadline-miss path (create → contribute → wait → refund). Output:

```
flashpool
  ✓ creates a pool
  ✓ contributes to a pool
  ✓ second contributor fills the pool
  ✓ creator withdraws
  ✓ refunds after deadline
```

### Deploy to devnet

```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

### Run the frontend

```bash
cd app
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The frontend talks to devnet by default; configure RPC and program ID via environment variables:

```bash
# app/.env.local
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

The USDC mint above is a devnet test mint compatible with [SPL token faucets](https://spl-token-faucet.com/).

---

## Tech stack

**On-chain**
- Solana program in Rust, built with [Anchor 0.32](https://www.anchor-lang.com/)
- SPL Token for USDC transfers; PDA-based vault per pool

**Frontend**
- [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19)
- TypeScript, [Tailwind CSS v4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com)
- [`@solana/wallet-adapter`](https://github.com/anza-xyz/wallet-adapter), [`@coral-xyz/anchor`](https://www.npmjs.com/package/@coral-xyz/anchor)
- [Framer Motion](https://www.framer.com/motion/) for the splash intro, navbar bolt, and roadmap S-curve

**Hosting**
- Deployed on [Vercel](https://vercel.com)

---

## Roadmap

| Stage  | Status   | What ships                                                          |
| ------ | -------- | ------------------------------------------------------------------- |
| NOW    | Live     | MVP on devnet: pool create + contribute + real-time state tracking. |
| NEXT   | Upcoming | Mainnet launch and embedded wallets (no extension required).        |
| EXPAND | Planned  | In-app buy/sell crypto, bank withdrawals, non-crypto onboarding.    |
| VISION | Goal     | Default infrastructure for global group payments.                   |

---

## Status

FlashPool is **devnet only**. It hasn't been audited. Don't use it with real money until the mainnet release ships with a security review.

Bugs, ideas, contributions — open an issue or a PR.
