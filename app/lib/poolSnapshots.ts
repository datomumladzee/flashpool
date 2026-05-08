// Local high-water-mark snapshot for each pool the user has touched.
//
// The on-chain `Contribution` PDA is closed when a contributor refunds, and
// the pool's `currentAmount` drops as funds drain back out. That makes the
// History card and the Pool page both look like nothing ever happened once
// every contributor refunds. We snapshot the latest state to localStorage on
// every successful pool fetch so we can show "who paid" and "how short of
// goal" even after refunds have closed the on-chain accounts.

const KEY = "flashpool_pool_snapshots";

export type ContributorSnapshot = {
  contributor: string;        // wallet pubkey, base58
  contributionPda: string;    // contribution PDA, base58 — survives across loads
  amount: number;             // USDC
  firstSeenAt: number;        // unix sec, first time we observed this contribution
};

export type PoolSnapshot = {
  address: string;            // pool PDA, base58
  raised: number;             // high-water-mark raised in USDC
  goal: number;               // pool goal in USDC, snapshotted at last fetch
  numContributors: number;    // contributor cap, snapshotted at last fetch
  reason: string;             // pool name, snapshotted at last fetch
  deadline: number;           // unix sec, snapshotted at last fetch
  contributors: ContributorSnapshot[];
  updatedAt: number;          // unix sec
};

type SnapshotMap = Record<string, PoolSnapshot>;

function readMap(): SnapshotMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as SnapshotMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: SnapshotMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore quota / disabled storage
  }
}

export function getPoolSnapshot(address: string): PoolSnapshot | null {
  return readMap()[address] ?? null;
}

export function getAllPoolSnapshots(): SnapshotMap {
  return readMap();
}

export function removePoolSnapshot(address: string): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  if (!(address in map)) return;
  delete map[address];
  writeMap(map);
}

export type SnapshotInput = {
  address: string;
  raised: number;
  goal: number;
  numContributors: number;
  reason: string;
  deadline: number;
  contributors: Array<{
    contributor: string;
    contributionPda: string;
    amount: number;
  }>;
};

// Merge live state into the existing snapshot. We keep the high-water mark for
// `raised`, union the contributor list (so refunded entries persist), and
// refresh the static fields (goal, name, deadline, cap) from the latest fetch.
export function savePoolSnapshot(input: SnapshotInput): PoolSnapshot {
  const map = readMap();
  const prev = map[input.address];
  const now = Math.floor(Date.now() / 1000);

  const seen = new Map<string, ContributorSnapshot>();
  if (prev) {
    for (const c of prev.contributors) seen.set(c.contributionPda, c);
  }
  for (const c of input.contributors) {
    if (!seen.has(c.contributionPda)) {
      seen.set(c.contributionPda, { ...c, firstSeenAt: now });
    }
  }

  const merged: PoolSnapshot = {
    address: input.address,
    raised: prev ? Math.max(prev.raised, input.raised) : input.raised,
    goal: input.goal,
    numContributors: input.numContributors,
    reason: input.reason,
    deadline: input.deadline,
    contributors: Array.from(seen.values()).sort(
      (a, b) => a.firstSeenAt - b.firstSeenAt,
    ),
    updatedAt: now,
  };

  map[input.address] = merged;
  writeMap(map);
  return merged;
}
