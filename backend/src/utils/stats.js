'use strict';

function todayUTC(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function monthUTC(date = new Date()) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

/** Compute current and longest streak from a list of YYYY-MM-DD strings. */
function computeStreaks(dates) {
  const uniq = Array.from(new Set(dates)).sort(); // ascending
  if (uniq.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const toNum = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 86400000);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (toNum(uniq[i]) - toNum(uniq[i - 1]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // current streak: count back from today (or yesterday) through consecutive days
  const today = toNum(todayUTC());
  const set = new Set(uniq.map(toNum));
  let current = 0;
  let cursor = today;
  if (!set.has(cursor)) cursor -= 1; // allow streak to count if last solve was yesterday
  while (set.has(cursor)) {
    current += 1;
    cursor -= 1;
  }

  return { currentStreak: current, longestStreak: Math.max(longest, current) };
}

module.exports = { todayUTC, monthUTC, computeStreaks };
