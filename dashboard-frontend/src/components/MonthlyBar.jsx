import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody, Empty } from './ui';

// byMonth is an object like { "2026-01": 12, "2026-02": 7 }.
function toSeries(byMonth) {
  if (!byMonth) return [];
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => {
      const [y, m] = month.split('-');
      const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
        month: 'short',
      });
      return { month, label, count };
    });
}

export default function MonthlyBar({ stats }) {
  const data = toSeries(stats?.byMonth);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solves by month</CardTitle>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <Empty title="No monthly activity" hint="Your solving cadence will chart here over time." />
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#1a2237" />
                <XAxis dataKey="label" tick={{ fill: '#8c98b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#8c98b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(124,140,248,0.08)' }} formatter={(v) => [v, 'solved']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#7c8cf8" maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
