import React from 'react';
import { Card } from './ui';
import { cn } from '../lib/utils';

export default function StatCard({ label, value, sub, accent = '#37d67a', mono = true }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-xs font-medium uppercase tracking-widest text-muted">{label}</p>
      <p
        className={cn('mt-2 text-3xl font-semibold text-slate-50', mono && 'font-mono')}
        style={{ color: accent }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}
