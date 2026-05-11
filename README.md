<div align="center">
  <img src="app/public/og-image.png" alt="FlashPool" width="100%" />
</div>

# FlashPool

Decentralized group pooling on Solana. Set a goal, a deadline, and a fixed contribution amount. Goal met → creator withdraws. Deadline missed → contributors refund themselves. No fees, no custodian.

**Program ID (devnet):** `4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3`

## Run locally

```bash
# Program
anchor build && anchor test

# Frontend
cd app && pnpm install && pnpm dev
```

Frontend env (`app/.env.local`):

```bash
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=4UMZ1zCeuyySrY8sxtG6Y5bUvAyMcm5F4JG2aMHw9nV3
NEXT_PUBLIC_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

## Stack

Solana / Anchor 0.32 · Next.js 16 · TypeScript · Tailwind v4 · Wallet Adapter · Framer Motion · Vercel

## Status

Devnet only, unaudited. Mainnet ships after a security review.
