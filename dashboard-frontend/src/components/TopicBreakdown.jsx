import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Empty } from './ui';

// byTopic: { "Dynamic Programming": 9, "Graphs": 4, ... }
export default function TopicBreakdown({ stats }) {
  const entries = Object.entries(stats?.byTopic || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const max = entries.length ? entries[0][1] : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top topics</CardTitle>
      </CardHeader>
      <CardBody>
        {entries.length === 0 ? (
          <Empty title="No topics tagged yet" hint="Topics are inferred per problem as you solve." />
        ) : (
          <ul className="space-y-3">
            {entries.map(([topic, count]) => (
              <li key={topic}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-slate-300">{topic}</span>
                  <span className="font-mono text-muted">{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-600">
                  <div
                    className="h-full rounded-full bg-idx"
                    style={{ width: `${max ? Math.round((count / max) * 100) : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
