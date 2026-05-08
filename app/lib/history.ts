import { removePoolSnapshot } from "./poolSnapshots";

const CREATED_KEY = "flashpool_created_pools";
const CONTRIBUTED_KEY = "flashpool_contributed_pools";
// Per-pool flag: did the creator opt to be one of the N contributors? Stored
// as a boolean map keyed by pool address. Off-chain only — the on-chain truth
// is "did pool.creator appear in the contributions list", which still drives
// the badge logic. This flag is what the create page set, and is what we'd
// reach for if/when we wire the atomic init+contribute transaction.
const CREATOR_CONTRIBUTES_KEY = "flashpool_creator_contributes";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, addresses: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(addresses));
  } catch {
    // ignore quota / disabled storage
  }
}

function recordUnique(key: string, address: string): void {
  if (!address) return;
  const current = readList(key);
  if (current.includes(address)) return;
  writeList(key, [...current, address]);
}

function readFlagMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CREATOR_CONTRIBUTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
}

function writeFlagMap(map: Record<string, boolean>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREATOR_CONTRIBUTES_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / disabled storage
  }
}

export function recordCreatedPool(
  address: string,
  creatorContributes?: boolean,
): void {
  recordUnique(CREATED_KEY, address);
  if (creatorContributes !== undefined) {
    setCreatorContributes(address, creatorContributes);
    if (creatorContributes) {
      // Mirror to the contributed set so the dual-listing on the History page
      // works even before the on-chain contribute tx settles.
      recordUnique(CONTRIBUTED_KEY, address);
    }
  }
}

export function recordContribution(address: string): void {
  recordUnique(CONTRIBUTED_KEY, address);
}

export function getCreatedPools(): string[] {
  return readList(CREATED_KEY);
}

export function getContributedPools(): string[] {
  return readList(CONTRIBUTED_KEY);
}

export function setCreatorContributes(address: string, value: boolean): void {
  if (!address) return;
  const map = readFlagMap();
  map[address] = value;
  writeFlagMap(map);
}

export function getCreatorContributes(address: string): boolean | null {
  if (!address) return null;
  const map = readFlagMap();
  return address in map ? map[address] : null;
}

// Drop a pool from both history lists and clear its local snapshot. Used by
// the History page's per-card delete button — the on-chain pool is untouched,
// it just stops appearing on this device.
export function forgetPool(address: string): void {
  if (!address || typeof window === "undefined") return;
  const created = readList(CREATED_KEY);
  if (created.includes(address)) {
    writeList(CREATED_KEY, created.filter((a) => a !== address));
  }
  const contributed = readList(CONTRIBUTED_KEY);
  if (contributed.includes(address)) {
    writeList(CONTRIBUTED_KEY, contributed.filter((a) => a !== address));
  }
  const flagMap = readFlagMap();
  if (address in flagMap) {
    delete flagMap[address];
    writeFlagMap(flagMap);
  }
  removePoolSnapshot(address);
}
