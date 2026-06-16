import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Badge, Dot, Spinner, Empty, Button } from './ui';
import PlatformBadge from './PlatformBadge';
import { difficultyMeta, statusMeta, fmtDateTime, cn } from '../lib/utils';

export default function SubmissionsTable({ data, loading, page, pages, onPage }) {
  const rows = data || [];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-600 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-200">Submissions</h2>
        <span className="font-mono text-xs text-muted">
          page {page} / {Math.max(pages, 1)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="p-5">
          <Empty
            title="No submissions captured yet"
            hint="Solve a problem on any supported judge with the extension installed — it lands here automatically."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-muted">
                <th className="px-5 py-2 font-medium">Problem</th>
                <th className="px-3 py-2 font-medium">Platform</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Difficulty</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Lang</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">When</th>
                <th className="hidden px-5 py-2 sm:table-cell" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const diff = difficultyMeta(s.difficulty);
                const st = statusMeta(s.status);
                return (
                  <tr
                    key={s._id}
                    className="border-t border-ink-600/70 transition-colors hover:bg-ink-600/40"
                  >
                    <td className="max-w-[200px] px-5 py-3 sm:max-w-[280px]">
                      <Link
                        to={`/submissions/${s._id}`}
                        className="block truncate font-medium text-slate-100 hover:text-ac"
                        title={s.problemTitle}
                      >
                        {s.problemTitle || s.problemSlug}
                      </Link>
                      <span className="mono block truncate text-[11px] text-faint">{s.problemSlug}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <PlatformBadge platform={s.platform} />
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 sm:table-cell">
                      <Badge color={diff.color}>{diff.label}</Badge>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 lg:table-cell">
                      <span className="mono text-xs text-muted">{s.language || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
                        <Dot color={st.color} />
                        {st.label}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-muted md:table-cell">{fmtDateTime(s.createdAt)}</td>
                    <td className="hidden px-5 py-3 text-right sm:table-cell">
                      <Link to={`/submissions/${s._id}`} className="text-xs font-medium text-idx hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-end gap-2 border-t border-ink-600 px-5 py-3">
          <Button variant="outline" className="px-3 py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Prev
          </Button>
          <Button
            variant="outline"
            className="px-3 py-1.5"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}
