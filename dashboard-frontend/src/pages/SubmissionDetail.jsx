import React, { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { Card, CardHeader, CardTitle, CardBody, Badge, Dot, Spinner, ErrorState, Button } from '../components/ui';
import PlatformBadge from '../components/PlatformBadge';
import { difficultyMeta, statusMeta, fmtDateTime } from '../lib/utils';

function Section({ title, children }) {
  return (
    <div>
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-idx">{title}</h4>
      <div className="text-sm leading-relaxed text-slate-300">{children}</div>
    </div>
  );
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const call = useCallback(() => api.submission(id), [id]);
  const { data, error, loading, refetch } = useApi(call, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  const s = data;
  const diff = difficultyMeta(s.difficulty);
  const st = statusMeta(s.status);
  const ai = s.aiExplanation;

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted hover:text-ac">
        ← Back to dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">{s.problemTitle || s.problemSlug}</h1>
          <p className="mono mt-1 text-xs text-faint">{s.problemSlug}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PlatformBadge platform={s.platform} />
            <Badge color={diff.color}>{diff.label}</Badge>
            <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: st.color }}>
              <Dot color={st.color} />
              {st.label}
            </span>
            <span className="text-xs text-muted">{fmtDateTime(s.createdAt)}</span>
          </div>
          {(s.topics || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.topics.map((t) => (
                <span key={t} className="rounded-md bg-ink-600 px-2 py-0.5 text-[11px] text-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {s.problemUrl && (
            <a href={s.problemUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" className="px-3 py-1.5">
                Problem
              </Button>
            </a>
          )}
          {s.githubUrl && (
            <a href={s.githubUrl} target="_blank" rel="noreferrer">
              <Button className="px-3 py-1.5">View on GitHub</Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Code */}
        <Card className="overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Solution</CardTitle>
            <span className="mono text-[11px] text-muted">{s.language || 'code'}</span>
          </CardHeader>
          <CardBody className="pt-0">
            {s.code ? (
              <pre className="ledger-line max-h-[520px] overflow-auto rounded-lg bg-ink-900/80 p-4 pl-6 text-[12.5px] leading-relaxed">
                <code className="mono text-slate-200 whitespace-pre">{s.code}</code>
              </pre>
            ) : (
              <p className="text-sm text-muted">Source not stored for this submission.</p>
            )}
          </CardBody>
        </Card>

        {/* AI explanation */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>AI explanation</CardTitle>
            {ai?.isFallback && <Badge color="#f5b556">fallback</Badge>}
          </CardHeader>
          <CardBody className="space-y-4">
            {!ai ? (
              <p className="text-sm text-muted">
                {s.status === 'completed'
                  ? 'No explanation was generated.'
                  : 'The explanation is still being generated — refresh shortly.'}
              </p>
            ) : (
              <>
                <Section title="Intuition">{ai.intuition || '—'}</Section>
                <Section title="Approach">{ai.approach || '—'}</Section>
                {ai.dryRun && <Section title="Dry run">{ai.dryRun}</Section>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-ink-600 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted">Time</p>
                    <p className="mono mt-1 text-sm text-ac">{ai.timeComplexity || '—'}</p>
                  </div>
                  <div className="rounded-lg border border-ink-600 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted">Space</p>
                    <p className="mono mt-1 text-sm text-idx">{ai.spaceComplexity || '—'}</p>
                  </div>
                </div>
                {ai.keyLearning && <Section title="Key learning">{ai.keyLearning}</Section>}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
