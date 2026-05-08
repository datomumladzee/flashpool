// Shared relative-time formatters. Three pre-built variants share the same
// fall-through unit picker so the rendered text stays consistent across the
// Create page, Pool page, and History cards.
//
// Unit rules:
//   ≥ 1 day                    → "Xd Yh"
//   1 hour up to 24 hours      → "Xh"
//   1 minute up to 59 minutes  → "Xm"
//   under 1 minute (positive)  → "<1m"

type Decomposed = {
  passed: boolean;
  days: number;
  hours: number;
  minutes: number;
  underMinute: boolean;
};

function decompose(date: Date): Decomposed {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) {
    return { passed: true, days: 0, hours: 0, minutes: 0, underMinute: false };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  return {
    passed: false,
    days,
    hours,
    minutes,
    underMinute: days === 0 && hours === 0 && minutes === 0,
  };
}

function durationText(d: Decomposed): string {
  if (d.underMinute) return "<1m";
  if (d.days >= 1) return `${d.days}d ${d.hours}h`;
  if (d.hours >= 1) return `${d.hours}h`;
  return `${d.minutes}m`;
}

/** Used by /create — "Xd Yh from now" / "Already passed". */
export function formatRelativeTime(date: Date): string {
  const d = decompose(date);
  if (d.passed) return "Already passed";
  return `${durationText(d)} from now`;
}

/** Used by /pool — "Xd Yh left" / "Expired". */
export function formatTimeLeft(date: Date): string {
  const d = decompose(date);
  if (d.passed) return "Expired";
  return `${durationText(d)} left`;
}

/** Used by /history live cards — "ends in Xd Yh" / "ended just now". */
export function formatEndsIn(date: Date): string {
  const d = decompose(date);
  if (d.passed) return "ended just now";
  return `ends in ${durationText(d)}`;
}
