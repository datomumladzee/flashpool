// TODO: replace with on-chain reads — these are placeholder pools used by the
// History page until we wire up real account fetches via the Anchor program.

export type MockPool = {
  address: string;
  name: string;
  raised: number;
  goal: number;
  contributors: number;
  contributorsCap: number;
  // Unix seconds. Past values mean the pool's deadline has elapsed.
  deadline: number;
  // Whether the connected user created this pool (for "My Pools" tab).
  createdByMe: boolean;
  // Whether the connected user has contributed (for "Contributed To" tab).
  contributedByMe: boolean;
};

const NOW = Math.floor(Date.now() / 1000);
const HOUR = 3600;
const DAY = 86_400;

export const MOCK_POOLS: MockPool[] = [];

// Keep the unit references so they're available when real fetches are wired.
void NOW;
void HOUR;
void DAY;
