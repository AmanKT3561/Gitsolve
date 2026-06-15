import React, { useMemo } from 'react';
import { Card } from './ui';

const DAY_MS = 86400000;
const WEEKS = 26; // ~6 months, fits the dashboard width comfortably

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

// Build a grid of [week][day] cells ending today, with counts from activeDates.
function buildGrid(activeDates) {
  const counts = {};
  (activeDates || []).forEach((d) => {
    const key = typeof d === 'string' ? d.slice(0, 10) : isoDay(new Date(d));
    counts[key] = (counts[key] || 0) + 1;
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // Walk back to the most recent Saturday so columns align to weeks (Sun..Sat).
  const end = new Date(today);
  const start = new Date(today.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  // Snap start to a Sunday.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const cells = [];
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
    const d = new Date(t);
    const key = isoDay(d);
    cells.push({ key, count: counts[key] || 0, date: d });
  }
  // Chunk into weeks of 7.
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function level(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const LEVEL_BG = ['#141a2e', '#16331f', '#1f6b41', '#2ba35f', '#37d67a'];

export default function StreakHeatmap({ stats }) {
  const weeks = useMemo(() => buildGrid(stats?.activeDates), [stats]);
  const current = stats?.currentStreak || 0;
  const longest = stats?.longestStreak || 0;
  const totalActive = (stats?.activeDates || []).length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">Activity ledger</h2>
          <p className="mt-0.5 text-xs text-muted">Every accepted solution, day by day</p>
        </div>
        <div className="flex items-center gap-5">
          <Metric value={current} label="current streak" accent />
          <Metric value={longest} label="longest" />
          <Metric value={totalActive} label="active days" />
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell) => {
                const lv = level(cell.count);
                return (
                  <div
                    key={cell.key}
                    title={`${cell.key}: ${cell.count} solved`}
                    className="h-3 w-3 rounded-[3px] transition-transform hover:scale-125"
                    style={{
                      backgroundColor: LEVEL_BG[lv],
                      outline: lv === 0 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted">
        <span>Less</span>
        {LEVEL_BG.map((bg, i) => (
          <span key={i} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: bg }} />
        ))}
        <span>More</span>
      </div>
    </Card>
  );
}

function Metric({ value, label, accent }) {
  return (
    <div className="text-right">
      <div
        className="font-mono text-xl font-semibold"
        style={{ color: accent ? '#37d67a' : '#e8ecf5' }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
