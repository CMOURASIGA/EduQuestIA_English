/**
 * Daily streak ("ofensiva diária") helpers.
 *
 * Dates are stored as ISO calendar days (YYYY-MM-DD) so streak math is not
 * sensitive to the browser's locale format.
 */

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`);
  const to = new Date(`${toIso}T00:00:00Z`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Computes the streak count after a completed lesson today.
 * - No previous activity: starts a fresh streak of 1.
 * - Already active today: streak is unchanged (already counted once).
 * - Exactly one day since the last activity: streak grows by 1.
 * - Two or more days since the last activity (or an unreadable date):
 *   the streak is broken and restarts at 1.
 */
export function getUpdatedStreak(lastActiveDate: string | null, currentStreak: number, now: Date = new Date()): number {
  const today = toIsoDate(now);
  if (!lastActiveDate) return 1;
  if (lastActiveDate === today) return currentStreak > 0 ? currentStreak : 1;

  const diffDays = daysBetween(lastActiveDate, today);
  if (diffDays === 1) return currentStreak + 1;
  return 1;
}
