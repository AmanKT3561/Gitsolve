// Tiny className combiner (no clsx dependency needed).
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function titleCase(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Canonical platform display + accent. Keys match backend platform slugs.
export const PLATFORMS = {
  leetcode: { label: 'LeetCode', color: '#f5b556' },
  codeforces: { label: 'Codeforces', color: '#7c8cf8' },
  codechef: { label: 'CodeChef', color: '#b07a4f' },
  geeksforgeeks: { label: 'GeeksforGeeks', color: '#37d67a' },
  gfg: { label: 'GeeksforGeeks', color: '#37d67a' },
  hackerrank: { label: 'HackerRank', color: '#2ec98b' },
  cses: { label: 'CSES', color: '#6ea8fe' },
  atcoder: { label: 'AtCoder', color: '#9aa6c4' },
  naukri: { label: 'Code360', color: '#ff8c42' },
  interviewbit: { label: 'InterviewBit', color: '#5b9bd5' },
};

export function platformMeta(slug) {
  return PLATFORMS[slug] || { label: titleCase(slug || 'Unknown'), color: '#8c98b8' };
}

export const DIFFICULTY = {
  easy: { label: 'Easy', color: '#37d67a' },
  medium: { label: 'Medium', color: '#f5b556' },
  hard: { label: 'Hard', color: '#ff5d6c' },
  unknown: { label: 'Unrated', color: '#8c98b8' },
};

export function difficultyMeta(d) {
  return DIFFICULTY[(d || 'unknown').toLowerCase()] || DIFFICULTY.unknown;
}

export const STATUS = {
  pending: { label: 'Queued', color: '#8c98b8' },
  github_saved: { label: 'Saved to GitHub', color: '#7c8cf8' },
  ai_processing: { label: 'Explaining', color: '#f5b556' },
  completed: { label: 'Completed', color: '#37d67a' },
  failed: { label: 'Failed', color: '#ff5d6c' },
};

export function statusMeta(s) {
  return STATUS[s] || { label: titleCase(s || ''), color: '#8c98b8' };
}
