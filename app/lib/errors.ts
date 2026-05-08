// Unified error translator. Takes raw errors from Solana / Anchor / wallet
// adapters / fetch / validation and returns a friendly, action-oriented shape
// the UI can render directly.
//
// Anchor program error codes are read from idl.json so the mapping stays in
// sync with the on-chain contract.

import idl from "./idl.json";

export type ErrorLevel = "error" | "warning" | "info";

export type TranslatedError = {
  title: string;
  message: string;
  level: ErrorLevel;
  action?: { label: string; href?: string };
  raw?: string;
};

type IdlErrorEntry = { code: number; name: string; msg?: string };

const RPC_ENDPOINT =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_RPC_ENDPOINT) || "";
const ON_DEVNET = !RPC_ENDPOINT || /devnet/i.test(RPC_ENDPOINT);

const SOL_FAUCET = "https://faucet.solana.com";
const USDC_FAUCET_DEVNET = "https://faucet.circle.com";

// Friendly text for known anchor codes. Keys match `idl.errors[].name` so this
// stays declarative — adding a code in the contract just needs an entry here.
const ANCHOR_FRIENDLY: Record<
  string,
  Pick<TranslatedError, "title" | "message">
> = {
  DeadlinePassed: {
    title: "Pool expired",
    message: "The deadline for this pool has passed.",
  },
  PoolClosed: {
    title: "Pool already closed",
    message: "These funds have already been settled.",
  },
  WrongMint: {
    title: "Wrong token",
    message: "This pool is funded with a different token. Use the pool's mint.",
  },
  GoalAlreadyReached: {
    title: "Pool is full",
    message: "This pool has already reached its goal.",
  },
  ZeroAmount: {
    title: "Amount must be positive",
    message: "Per-person amount must be greater than zero.",
  },
  ZeroContributors: {
    title: "Need at least one contributor",
    message: "Pool must have one or more contributors.",
  },
  GoalNotReached: {
    title: "Goal not reached yet",
    message: "Withdrawal is only available once the goal is met.",
  },
  AlreadyWithdrawn: {
    title: "Already withdrawn",
    message: "These funds have already been claimed.",
  },
  RefundNotAvailable: {
    title: "Refunds not yet available",
    message: "Refunds open once the pool's deadline passes or contributors vote to close early.",
  },
  GoalWasMet: {
    title: "Refunds not available",
    message: "The goal was met — funds are reserved for the creator.",
  },
  CancelAlreadyRequested: {
    title: "Cancel already pending",
    message: "A cancel request is already open for this pool. Contributors are voting now.",
  },
  CancelNotRequested: {
    title: "No cancel request",
    message: "The creator hasn't requested to close this pool yet, so there's nothing to vote on.",
  },
  PoolInVoting: {
    title: "Voting in progress",
    message: "Contributions are paused while contributors vote on the pending cancel.",
  },
  PoolClosedEarly: {
    title: "Pool closed early",
    message: "This pool was closed by contributor vote. Contributions are no longer accepted.",
  },
  VoteCountOverflow: {
    title: "Vote count error",
    message: "Couldn't record your vote because the count would exceed limits. This shouldn't happen — please refresh.",
  },
  VoteCountUnderflow: {
    title: "Vote count error",
    message: "Couldn't undo your vote — the on-chain count looks inconsistent. Please refresh.",
  },
};

const idlErrors: IdlErrorEntry[] = ((idl as any).errors as IdlErrorEntry[]) ?? [];
const idlByCode = new Map<number, IdlErrorEntry>(
  idlErrors.map((e) => [e.code, e]),
);

function stringify(e: unknown): { msg: string; raw: string } {
  if (e == null) return { msg: "", raw: "" };
  if (typeof e === "string") return { msg: e, raw: e };
  if (e instanceof Error) {
    const logs = (e as { logs?: unknown }).logs;
    const logBlock =
      Array.isArray(logs) && logs.length
        ? "\n" + logs.join("\n")
        : "";
    const name = e.name && e.name !== "Error" ? `${e.name}: ` : "";
    return { msg: e.message + logBlock, raw: `${name}${e.message}${logBlock}` };
  }
  try {
    const json = JSON.stringify(e, null, 2);
    return { msg: json, raw: json };
  } catch {
    const s = String(e);
    return { msg: s, raw: s };
  }
}

function fromAnchorCustom(
  hex: string,
  raw: string,
): TranslatedError | null {
  const code = parseInt(hex, 16);
  if (!Number.isFinite(code)) return null;
  const idlEntry = idlByCode.get(code);
  if (idlEntry) {
    const friendly = ANCHOR_FRIENDLY[idlEntry.name];
    if (friendly) {
      return { ...friendly, level: "error", raw };
    }
    return {
      title: prettifyName(idlEntry.name),
      message: idlEntry.msg ?? "The contract rejected this transaction.",
      level: "error",
      raw,
    };
  }
  return {
    title: "Something went wrong on-chain",
    message: "The contract rejected this transaction.",
    level: "error",
    raw,
  };
}

function prettifyName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

export function translateError(error: unknown): TranslatedError {
  const { msg, raw } = stringify(error);
  const lower = msg.toLowerCase();

  // 1. User-cancelled — informational, not a failure.
  if (
    lower.includes("user rejected") ||
    lower.includes("rejected the request") ||
    lower.includes("user denied") ||
    lower.includes("transaction cancelled") ||
    lower.includes("transaction was rejected")
  ) {
    return {
      title: "Transaction cancelled",
      message: "You cancelled the request in your wallet.",
      level: "info",
      raw,
    };
  }

  // 2. Wallet not connected.
  if (
    lower.includes("walletnotconnected") ||
    lower.includes("wallet not connected") ||
    lower.includes("not connected to a wallet")
  ) {
    return {
      title: "Connect your wallet first",
      message: "You need a Solana wallet connected to continue.",
      level: "warning",
      raw,
    };
  }

  // 3. Anchor / custom program error — drives most contract failures.
  const anchorMatch = msg.match(/custom program error:\s*0x([0-9a-fA-F]+)/);
  if (anchorMatch) {
    const out = fromAnchorCustom(anchorMatch[1], raw);
    if (out) return out;
  }
  // AnchorError thrown by the SDK has a structured shape too.
  const anchorObj = (error as { error?: { errorCode?: { number?: number } } })
    ?.error?.errorCode?.number;
  if (typeof anchorObj === "number") {
    const out = fromAnchorCustom(anchorObj.toString(16), raw);
    if (out) return out;
  }

  // 4. Account already in use → contributor PDA collision = already contributed.
  if (lower.includes("already in use")) {
    return {
      title: "Already contributed",
      message: "You've already paid your share to this pool.",
      level: "info",
      raw,
    };
  }

  // 5. Insufficient SOL for fees / rent.
  if (
    lower.includes("insufficient lamports") ||
    lower.includes("attempt to debit an account but found no record") ||
    lower.includes("insufficient funds for rent") ||
    lower.includes("insufficient sol")
  ) {
    return {
      title: "Not enough SOL for gas",
      message: "You need a small amount of SOL to pay network fees on Solana.",
      level: "error",
      action: ON_DEVNET
        ? { label: "Get devnet SOL", href: SOL_FAUCET }
        : { label: "How to get SOL", href: "https://solana.com/docs/intro/wallets" },
      raw,
    };
  }

  // 6. Insufficient SPL token balance (USDC).
  if (
    lower.includes("insufficient funds") ||
    lower.includes("0x1") && lower.includes("token")
  ) {
    return {
      title: "Not enough USDC",
      message: "Your wallet doesn't have enough USDC to cover this contribution.",
      level: "error",
      action: ON_DEVNET
        ? { label: "Get devnet USDC", href: USDC_FAUCET_DEVNET }
        : { label: "Get USDC", href: "https://www.circle.com/usdc" },
      raw,
    };
  }

  // 7. Wrong network (heuristic — blockhash + cluster mismatch is the usual tell).
  if (
    (lower.includes("blockhash") && lower.includes("not found")) ||
    lower.includes("cluster mismatch") ||
    lower.includes("wrong network")
  ) {
    return {
      title: "Wrong network",
      message: `Switch your wallet to ${ON_DEVNET ? "devnet" : "mainnet"} and try again.`,
      level: "error",
      raw,
    };
  }

  // 8. Network / RPC failures.
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("unable to connect") ||
    lower.includes("fetch failed") ||
    lower.includes("getaddrinfo") ||
    lower.includes("rpc")
  ) {
    return {
      title: "Network issue",
      message: "Couldn't reach the Solana network. Check your connection and try again.",
      level: "error",
      raw,
    };
  }

  // 9. Account-fetch / "Pool not found" path.
  if (
    lower.includes("account does not exist") ||
    lower.includes("could not find") ||
    lower.includes("invalid account")
  ) {
    return {
      title: "Pool not found",
      message: "We couldn't find a pool at this address.",
      level: "error",
      raw,
    };
  }

  // 10. Fallback.
  return {
    title: "Something went wrong",
    message: "Please try again. If this keeps happening, refresh the page.",
    level: "error",
    raw,
  };
}
