import { removePoolSnapshot } from "./poolSnapshots";

const CREATED_KEY = "flashpool_created_pools";
const CONTRIBUTED_KEY = "flashpool_contributed_pools";

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

export function recordCreatedPool(address: string): void {
  recordUnique(CREATED_KEY, address);
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
  removePoolSnapshot(address);
}
