import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardBody, Empty } from './ui';
import { DIFFICULTY } from '../lib/utils';

export default function DifficultyPie({ stats }) {
  const data = [
    { key: 'easy', name: 'Easy', value: stats?.easySolved || 0, color: DIFFICULTY.easy.color },
    { key: 'medium', name: 'Medium', value: stats?.mediumSolved || 0, color: DIFFICULTY.medium.color },
    { key: 'hard', name: 'Hard', value: stats?.hardSolved || 0, color: DIFFICULTY.hard.color },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Difficulty mix</CardTitle>
      </CardHeader>
      <CardBody>
        {total === 0 ? (
          <Empty title="No solves yet" hint="Accepted submissions will break down by difficulty here." />
        ) : (
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ color: '#e8ecf5' }}
                  itemStyle={{ color: '#e8ecf5' }}
                  formatter={(v, n) => [v, n]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  formatter={(v) => <span style={{ color: '#8c98b8', fontSize: 12 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
              <span className="font-mono text-3xl font-semibold text-slate-50">{total}</span>
              <span className="text-[11px] uppercase tracking-widest text-muted">solved</span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
