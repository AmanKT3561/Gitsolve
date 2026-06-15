import React, { useCallback, useState } from 'react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import StatCard from '../components/StatCard';
import DifficultyPie from '../components/DifficultyPie';
import MonthlyBar from '../components/MonthlyBar';
import TopicBreakdown from '../components/TopicBreakdown';
import StreakHeatmap from '../components/StreakHeatmap';
import SubmissionsTable from '../components/SubmissionsTable';
import { Spinner, ErrorState } from '../components/ui';

const PAGE_SIZE = 20;

export default function Dashboard() {
  const [page, setPage] = useState(1);

  const statsCall = useCallback(() => api.statistics(), []);
  const { data: stats, error: statsErr, loading: statsLoading, refetch: refetchStats } = useApi(statsCall, []);

  const subsCall = useCallback(() => api.submissions({ page, limit: PAGE_SIZE }), [page]);
  const { data: subsRes, loading: subsLoading } = useApi(subsCall, [page]);

  const submissions = subsRes?.items || [];
  const totalPages = subsRes?.pages || 1;

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (statsErr) {
    return <ErrorState message={statsErr.message} onRetry={refetchStats} />;
  }

  const s = stats || {};

  return (
    <div className="space-y-6">
      {/* Hero: the activity ledger is the signature element */}
      <StreakHeatmap stats={s} />

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total solved" value={s.totalSolved || 0} accent="#37d67a" />
        <StatCard
          label="Platforms"
          value={Object.keys(s.byPlatform || {}).length}
          sub="judges connected"
          accent="#7c8cf8"
        />
        <StatCard label="Current streak" value={`${s.currentStreak || 0}d`} accent="#f5b556" />
        <StatCard label="Longest streak" value={`${s.longestStreak || 0}d`} accent="#6ea8fe" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DifficultyPie stats={s} />
        <div className="lg:col-span-2">
          <MonthlyBar stats={s} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TopicBreakdown stats={s} />
        <div className="lg:col-span-2">
          <SubmissionsTable
            data={submissions}
            loading={subsLoading}
            page={page}
            pages={totalPages}
            onPage={setPage}
          />
        </div>
      </div>
    </div>
  );
}
